'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import ScannerView from '@/components/scanner/ScannerView';
import CartSidebar from '@/components/cart/CartSidebar';
import ConfigWindow from '@/components/config/ConfigWindow';
import SimulationWindow from '@/components/simulation/SimulationWindow';
import ProductModal from '@/components/admin/ProductModal';
import HistoryModal from '@/components/history/HistoryModal';
import Notification from '@/components/ui/notification';
import { Package } from 'lucide-react';

export default function HomePage() {
  const socket = useSocket();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && socket.isConnected && socket.getProducts) {
      socket.getProducts();
    }
  }, [isClient, socket.isConnected]); // Remove socket.getProducts from dependencies

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Memuat Sistem Self-Checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sistem Self-Checkout</h1>
                <p className="text-sm text-gray-500">Deteksi Produk Bertenaga AI</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ConfigWindow />
              <HistoryModal />
              <ProductModal />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          <div className="lg:col-span-2">
            <ScannerView />
          </div>
          <div className="lg:col-span-1">
            <CartSidebar />
          </div>
        </div>
      </main>

      <SimulationWindow />
      <Notification message={socket.notification} />
    </div>
  );
}