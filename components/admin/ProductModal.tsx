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
import { Package, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ProductModal() {
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '' });
  const [editProduct, setEditProduct] = useState<{ name: string; price: string } | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

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

  const handleDeleteAllProducts = () => {
    socket.deleteAllProducts();
    setShowDeleteAllDialog(false);
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
        Produk
      </Button>
      
      <DraggableWindow
        title="Manajemen Produk"
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
            <TabsTrigger value="list">Daftar Produk</TabsTrigger>
            <TabsTrigger value="add">Tambah Produk</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <Badge variant="secondary">{productEntries.length} produk</Badge>
              </div>
              {productEntries.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Hapus Semua Produk
                </Button>
              )}
            </div>

            {editProduct && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-sm">Edit Produk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nama Produk</Label>
                      <Input
                        value={editProduct.name}
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div>
                      <Label>Harga (Rp)</Label>
                      <Input
                        type="number"
                        value={editProduct.price}
                        onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                        placeholder="Masukkan harga baru"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUpdateProduct} size="sm">
                      Simpan Perubahan
                    </Button>
                    <Button 
                      onClick={() => setEditProduct(null)} 
                      variant="outline" 
                      size="sm"
                    >
                      Batal
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
                    <p className="text-gray-500">Tidak ada produk ditemukan</p>
                    <p className="text-sm text-gray-400">Tambahkan produk pertama untuk memulai</p>
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
                  Tambah Produk Baru
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Masukkan nama produk"
                    />
                  </div>
                  <div>
                    <Label>Price (Rp)</Label>
                    <Input
                      type="number"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="Masukkan harga"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddProduct}
                  className="w-full"
                  disabled={!newProduct.name || !newProduct.price}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Produk
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DraggableWindow>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Semua Produk</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <span>Apakah Anda yakin ingin menghapus semua {productEntries.length} produk?</span>
                <div className="bg-red-50 p-3 rounded-md mt-3">
                  <div className="text-sm font-medium text-red-600">Tindakan ini tidak dapat dibatalkan!</div>
                  <div className="text-sm text-red-500 mt-1">Semua data produk akan dihapus secara permanen.</div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAllProducts}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete All Products
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}