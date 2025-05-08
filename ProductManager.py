import os
import yaml


class ProductManager:
    def __init__(self, config_path="products.yaml"):
        self.config_path = config_path
        self.products = {}
        self.load_products()

    def load_products(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as file:
                config = yaml.safe_load(file)
                if config and 'products' in config:
                    for product, details in config['products'].items():
                        self.products[product.lower()] = details['price']
                    print(f"Loaded {len(self.products)} products from config")
                else:
                    self.products = {}
                    print("No products found in config, using empty catalog")
        else:
            self.products = {}
            print(f"Config file {self.config_path} not found, using empty catalog")
            self.save_products()

    def save_products(self):
        config = {"products": {}}
        for product, price in self.products.items():
            config["products"][product] = {"price": price}

        with open(self.config_path, 'w') as file:
            yaml.dump(config, file, default_flow_style=False)
        print(f"Saved {len(self.products)} products to config")

    def get_products(self):
        return self.products

    def add_product(self, name, price):
        name_lower = name.lower()
        self.products[name_lower] = price
        self.save_products()
        return {"name": name_lower, "price": price}

    def update_product(self, name, price):
        name_lower = name.lower()
        if name_lower in self.products:
            self.products[name_lower] = price
            self.save_products()
            return {"name": name_lower, "price": price}
        return None

    def delete_product(self, name):
        name_lower = name.lower()
        if name_lower in self.products:
            del self.products[name_lower]
            self.save_products()
            return {"name": name_lower}
        return None
