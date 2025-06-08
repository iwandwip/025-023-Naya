import os
import yaml


class ProductManager:
    def __init__(self, firestore_manager, config_path="products.yaml"):
        self.config_path = config_path
        self.firestore_manager = firestore_manager
        self.products = {}
        self.load_products()

    def load_products(self):
        if self.firestore_manager.is_connected():
            self.products = self.firestore_manager.get_products()
            print(f"Loaded {len(self.products)} products from Firestore")

            if self.products:
                self.save_to_yaml()  # Backup to YAML
                return

        # If Firestore is not connected or no products were found, try loading from YAML
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as file:
                config = yaml.safe_load(file)
                if config and 'products' in config:
                    for product, details in config['products'].items():
                        self.products[product.lower()] = details['price']
                    print(f"Loaded {len(self.products)} products from YAML config")

                    # Sync to Firestore if connected
                    if self.firestore_manager.is_connected():
                        self.sync_to_firestore()
                else:
                    self.products = {}
                    print("No products found in YAML config, using empty catalog")
        else:
            self.products = {}
            print(f"Config file {self.config_path} not found, using empty catalog")
            self.save_to_yaml()

    def save_to_yaml(self):
        config = {"products": {}}
        for product, price in self.products.items():
            config["products"][product] = {"price": price}

        with open(self.config_path, 'w') as file:
            yaml.dump(config, file, default_flow_style=False)
        print(f"Saved {len(self.products)} products to YAML config")

    def sync_to_firestore(self):
        if not self.firestore_manager.is_connected():
            return

        for product, price in self.products.items():
            self.firestore_manager.add_product(product, price)

        print(f"Synced {len(self.products)} products to Firestore")

    def get_products(self):
        return self.products

    def add_product(self, name, price):
        name_lower = name.lower()

        # Try to add to Firestore first
        if self.firestore_manager.is_connected():
            result = self.firestore_manager.add_product(name_lower, price)
            if result:
                self.products[name_lower] = price
                self.save_to_yaml()  # Backup to YAML
                return {"name": name_lower, "price": price}

        # If Firestore failed or not connected, just update local and YAML
        self.products[name_lower] = price
        self.save_to_yaml()
        return {"name": name_lower, "price": price}

    def update_product(self, name, price):
        name_lower = name.lower()
        if name_lower not in self.products:
            return None

        # Try to update in Firestore first
        if self.firestore_manager.is_connected():
            result = self.firestore_manager.update_product(name_lower, price)
            if result:
                self.products[name_lower] = price
                self.save_to_yaml()  # Backup to YAML
                return {"name": name_lower, "price": price}

        # If Firestore failed or not connected, just update local and YAML
        self.products[name_lower] = price
        self.save_to_yaml()
        return {"name": name_lower, "price": price}

    def delete_product(self, name):
        name_lower = name.lower()
        if name_lower not in self.products:
            return None

        # Try to delete from Firestore first
        if self.firestore_manager.is_connected():
            result = self.firestore_manager.delete_product(name_lower)
            if result:
                del self.products[name_lower]
                self.save_to_yaml()  # Backup to YAML
                return {"name": name_lower}

        # If Firestore failed or not connected, just delete from local and YAML
        del self.products[name_lower]
        self.save_to_yaml()
        return {"name": name_lower}
