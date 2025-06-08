import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os
import datetime
import uuid
import json


class FirestoreManager:
    def __init__(self, credentials_path="firebase-credentials.json"):
        self.credentials_path = credentials_path
        self.db = None
        self.initialize_firestore()

    def initialize_firestore(self):
        if not os.path.exists(self.credentials_path):
            print(f"Firebase credentials file {self.credentials_path} not found.")
            print("Creating a sample credentials file. Please replace with your actual credentials.")
            self._create_sample_credentials()

        try:
            cred = credentials.Certificate(self.credentials_path)
            firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            print("Firestore connection initialized successfully")
        except Exception as e:
            print(f"Error initializing Firestore: {e}")
            self.db = None

    def _create_sample_credentials(self):
        sample_credentials = {
            "type": "service_account",
            "project_id": "your-project-id",
            "private_key_id": "your-private-key-id",
            "private_key": "your-private-key",
            "client_email": "your-client-email",
            "client_id": "your-client-id",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "your-client-cert-url"
        }

        with open(self.credentials_path, 'w') as f:
            json.dump(sample_credentials, f, indent=2)

    def is_connected(self):
        return self.db is not None

    def get_products(self):
        if not self.is_connected():
            return {}

        products = {}
        try:
            products_ref = self.db.collection('products')
            docs = products_ref.stream()

            for doc in docs:
                product_data = doc.to_dict()
                products[product_data['name'].lower()] = product_data['price']

            return products
        except Exception as e:
            print(f"Error retrieving products from Firestore: {e}")
            return {}

    def add_product(self, name, price):
        if not self.is_connected():
            return None

        try:
            product_id = str(uuid.uuid4())
            product_ref = self.db.collection('products').document(product_id)

            product_data = {
                'name': name.lower(),
                'price': price,
                'created_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP
            }

            product_ref.set(product_data)

            product_doc = product_ref.get()
            product_data = product_doc.to_dict()

            return {
                'id': product_id,
                'name': product_data['name'],
                'price': product_data['price']
            }
        except Exception as e:
            print(f"Error adding product to Firestore: {e}")
            return None

    def update_product(self, name, price):
        if not self.is_connected():
            return None

        try:
            products_ref = self.db.collection('products')
            query = products_ref.where('name', '==', name.lower())
            docs = query.stream()

            updated = False
            product_id = None

            for doc in docs:
                product_id = doc.id
                product_ref = products_ref.document(product_id)
                product_ref.update({
                    'price': price,
                    'updated_at': firestore.SERVER_TIMESTAMP
                })
                updated = True
                break

            if updated:
                return {
                    'id': product_id,
                    'name': name.lower(),
                    'price': price
                }
            else:
                print(f"Product {name} not found in Firestore")
                return None
        except Exception as e:
            print(f"Error updating product in Firestore: {e}")
            return None

    def delete_product(self, name):
        if not self.is_connected():
            return None

        try:
            products_ref = self.db.collection('products')
            query = products_ref.where('name', '==', name.lower())
            docs = query.stream()

            deleted = False
            product_id = None

            for doc in docs:
                product_id = doc.id
                products_ref.document(product_id).delete()
                deleted = True
                break

            if deleted:
                return {
                    'id': product_id,
                    'name': name.lower()
                }
            else:
                print(f"Product {name} not found in Firestore")
                return None
        except Exception as e:
            print(f"Error deleting product from Firestore: {e}")
            return None

    def save_transaction(self, cart, total):
        if not self.is_connected():
            return None

        try:
            transaction_id = str(uuid.uuid4())
            transaction_ref = self.db.collection('transactions').document(transaction_id)

            items = []
            for product_name, details in cart.items():
                items.append({
                    'name': product_name,
                    'price': details['price'],
                    'quantity': details['quantity'],
                    'subtotal': details['price'] * details['quantity']
                })

            transaction_data = {
                'items': items,
                'total': total,
                'timestamp': firestore.SERVER_TIMESTAMP
            }

            transaction_ref.set(transaction_data)

            transaction_doc = transaction_ref.get()
            transaction_data = transaction_doc.to_dict()

            return {
                'id': transaction_id,
                'items': transaction_data['items'],
                'total': transaction_data['total'],
                'timestamp': transaction_data['timestamp']
            }
        except Exception as e:
            print(f"Error saving transaction to Firestore: {e}")
            return None

    def get_transactions(self, limit=20):
        if not self.is_connected():
            return []

        try:
            transactions_ref = self.db.collection('transactions')
            query = transactions_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
            docs = query.stream()

            transactions = []
            for doc in docs:
                data = doc.to_dict()
                transactions.append({
                    'id': doc.id,
                    'items': data.get('items', []),
                    'total': data.get('total', 0),
                    'timestamp': data.get('timestamp')
                })

            return transactions
        except Exception as e:
            print(f"Error retrieving transactions from Firestore: {e}")
            return []

    def get_transactions_by_date_range(self, start_date, end_date):
        if not self.is_connected():
            return []

        try:
            transactions_ref = self.db.collection('transactions')

            if isinstance(start_date, str):
                start_date = datetime.datetime.fromisoformat(start_date)
            if isinstance(end_date, str):
                end_date = datetime.datetime.fromisoformat(end_date)

            end_date = end_date + datetime.timedelta(days=1)

            query = transactions_ref.where('timestamp', '>=', start_date).where('timestamp', '<', end_date)
            docs = query.stream()

            transactions = []
            for doc in docs:
                data = doc.to_dict()
                transactions.append({
                    'id': doc.id,
                    'items': data.get('items', []),
                    'total': data.get('total', 0),
                    'timestamp': data.get('timestamp')
                })

            return transactions
        except Exception as e:
            print(f"Error retrieving transactions by date range from Firestore: {e}")
            return []

    def delete_transaction(self, transaction_id):
        if not self.is_connected():
            return False

        try:
            transaction_ref = self.db.collection('transactions').document(transaction_id)
            transaction_doc = transaction_ref.get()

            if not transaction_doc.exists:
                print(f"Transaction {transaction_id} not found in Firestore")
                return False

            transaction_ref.delete()
            return True
        except Exception as e:
            print(f"Error deleting transaction from Firestore: {e}")
            return False

    def get_transaction_by_id(self, transaction_id):
        if not self.is_connected():
            return None

        try:
            transaction_ref = self.db.collection('transactions').document(transaction_id)
            transaction_doc = transaction_ref.get()

            if not transaction_doc.exists:
                print(f"Transaction {transaction_id} not found in Firestore")
                return None

            data = transaction_doc.to_dict()
            return {
                'id': transaction_doc.id,
                'items': data.get('items', []),
                'total': data.get('total', 0),
                'timestamp': data.get('timestamp')
            }
        except Exception as e:
            print(f"Error retrieving transaction from Firestore: {e}")
            return None
