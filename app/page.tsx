'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    socket.getProducts();
  }, [socket.getProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Self-Checkout System</h1>
                <p className="text-sm text-gray-500">AI-Powered Product Detection</p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
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