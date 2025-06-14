'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DraggableWindow from '@/components/ui/draggable-window';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';

export default function ProductModal() {
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '' });
  const [editProduct, setEditProduct] = useState<{ name: string; price: string } | null>(null);

  const getProducts = useCallback(() => {
    if (socket?.getProducts) {
      socket.getProducts();
    }
  }, [socket?.getProducts]);

  useEffect(() => {
    if (open) {
      // Add delay to prevent rapid calls
      const timer = setTimeout(() => {
        getProducts();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [open]); // Remove getProducts from dependencies

  const handleAddProduct = () => {
    if (newProduct.name && newProduct.price) {
      socket.addProduct(newProduct.name, parseInt(newProduct.price));
      setNewProduct({ name: '', price: '' });
    }
  };

  const handleUpdateProduct = () => {
    if (editProduct?.name && editProduct.price) {
      socket.updateProduct(editProduct.name, parseInt(editProduct.price));
      setEditProduct(null);
    }
  };

  const handleDeleteProduct = (name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      socket.deleteProduct(name);
    }
  };

  const productEntries = Object.entries(socket.products);

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Package className="h-4 w-4" />
        Products
      </Button>
      
      <DraggableWindow
        title="Product Management"
        icon={<Package className="h-5 w-5" />}
        isOpen={open}
        onClose={() => setOpen(false)}
        defaultPosition={{ x: 150, y: 150 }}
        defaultSize={{ width: '800px', height: '600px' }}
        minWidth="500px"
        minHeight="400px"
      >

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Product List</TabsTrigger>
            <TabsTrigger value="add">Add Product</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {editProduct && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-sm">Edit Product</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Product Name</Label>
                      <Input
                        value={editProduct.name}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label>Price (Rp)</Label>
                      <Input
                        type="number"
                        value={editProduct.price}
                        onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                        placeholder="Enter new price"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateProduct} size="sm">
                      Save Changes
                    </Button>
                    <Button 
                      onClick={() => setEditProduct(null)} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3">
              {productEntries.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No products found</p>
                    <p className="text-sm text-gray-400">Add your first product to get started</p>
                  </CardContent>
                </Card>
              ) : (
                productEntries.map(([name, price]) => (
                  <Card key={name}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-medium capitalize">{name}</h3>
                        <p className="text-sm text-gray-600">Rp {price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{price}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditProduct({ name, price: price.toString() })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProduct(name)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Product
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label>Price (Rp)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="Enter price"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddProduct}
                  className="w-full"
                  disabled={!newProduct.name || !newProduct.price}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DraggableWindow>
    </>
  );
}