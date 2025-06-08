import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import uuid
import random
import datetime
import time
import os


def init_firestore():
    cred_path = "firebase-credentials.json"
    if not os.path.exists(cred_path):
        print(f"Error: {cred_path} not found!")
        print("Please create a service account key file from Firebase console and save it as firebase-credentials.json")
        return None

    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firestore connection initialized successfully")
        return db
    except Exception as e:
        print(f"Error initializing Firestore: {e}")
        return None


def create_products(db):
    if not db:
        return

    products = [
        {"name": "laptop", "price": 10000},
        {"name": "smartphone", "price": 5000},
        {"name": "headphones", "price": 1000},
        {"name": "mouse", "price": 300},
        {"name": "keyboard", "price": 500},
        {"name": "monitor", "price": 3000},
        {"name": "tablet", "price": 4000},
        {"name": "usb drive", "price": 200},
        {"name": "hard drive", "price": 1500},
        {"name": "webcam", "price": 800}
    ]

    products_collection = db.collection('products')

    print(f"Adding {len(products)} products to Firestore...")
    for product in products:
        product_id = str(uuid.uuid4())
        product_data = {
            "name": product["name"].lower(),
            "price": product["price"],
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }

        products_collection.document(product_id).set(product_data)
        print(f"  Added: {product['name']} - Rp {product['price']}")

    print("Products added successfully!")


def create_transactions(db):
    if not db:
        return

    products = []
    products_collection = db.collection('products')

    print("Fetching products from Firestore...")
    try:
        products_docs = products_collection.stream()
        for doc in products_docs:
            product_data = doc.to_dict()
            products.append({
                "name": product_data["name"],
                "price": product_data["price"]
            })

        if not products:
            print("No products found! Please add products first.")
            return

        print(f"Found {len(products)} products.")
    except Exception as e:
        print(f"Error fetching products: {e}")
        return

    # Create 5 dummy transactions from the past 30 days
    transactions_collection = db.collection('transactions')
    now = datetime.datetime.now()

    print("\nCreating 5 dummy transactions...")
    for i in range(5):
        # Random date within the last 30 days
        random_days = random.randint(0, 30)
        transaction_date = now - datetime.timedelta(days=random_days)

        # Random number of items (1-5)
        items_count = random.randint(1, 5)

        # Random selection of products
        selected_products = random.sample(products, items_count)

        items = []
        total = 0

        for product in selected_products:
            quantity = random.randint(1, 3)
            subtotal = product["price"] * quantity

            items.append({
                "name": product["name"],
                "price": product["price"],
                "quantity": quantity,
                "subtotal": subtotal
            })

            total += subtotal

        transaction_id = str(uuid.uuid4())
        transaction_data = {
            "items": items,
            "total": total,
            "timestamp": transaction_date
        }

        transactions_collection.document(transaction_id).set(transaction_data)

        items_str = ", ".join([f"{item['name']} x{item['quantity']}" for item in items])
        print(f"  Added transaction on {transaction_date.strftime('%Y-%m-%d')}: {items_str} = Rp {total}")

    print("Transactions added successfully!")


def main():
    print("Initializing Firestore connection...")
    db = init_firestore()

    if not db:
        print("Failed to initialize Firestore. Exiting.")
        return

    print("\n=== SEEDING SAMPLE DATA TO FIRESTORE ===\n")

    choice = input("Do you want to seed products? (y/n): ").lower()
    if choice == 'y':
        create_products(db)

    choice = input("\nDo you want to seed transactions? (y/n): ").lower()
    if choice == 'y':
        create_transactions(db)

    print("\nData seeding completed!")


if __name__ == "__main__":
    main()
