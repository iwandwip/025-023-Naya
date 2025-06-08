'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/lib/constants';
import { Cart, Product, Transaction, SimulatedObject, AppConfig } from '@/lib/types';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [total, setTotal] = useState(0);
  const [products, setProducts] = useState<Record<string, number>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [simulatedObjects, setSimulatedObjects] = useState<Record<string, SimulatedObject>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL);
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('cart_update', (data) => {
      setCart(data.cart);
      setTotal(data.total);
    });

    socketInstance.on('scanning_complete', (data) => {
      setCart(data.cart);
      setTotal(data.total);
      setIsScanning(false);
    });

    socketInstance.on('products_list', (data) => {
      setProducts(data);
    });

    socketInstance.on('product_added', (data) => {
      setProducts(prev => ({ ...prev, [data.name]: data.price }));
      showNotification(`Product ${data.name} added successfully`);
    });

    socketInstance.on('product_updated', (data) => {
      setProducts(prev => ({ ...prev, [data.name]: data.price }));
      showNotification(`Product ${data.name} updated successfully`);
    });

    socketInstance.on('product_deleted', (data) => {
      setProducts(prev => {
        const newProducts = { ...prev };
        delete newProducts[data.name];
        return newProducts;
      });
      showNotification(`Product ${data.name} deleted successfully`);
    });

    socketInstance.on('transaction_history', (data) => {
      setTransactions(data);
    });

    socketInstance.on('transaction_deleted', (data) => {
      if (data.success) {
        showNotification("Transaction deleted successfully");
      }
    });

    socketInstance.on('item_removed', (data) => {
      if (data.success) {
        showNotification(`Removed ${data.name} from cart`);
      }
    });

    socketInstance.on('simulation_toggled', (data) => {
      setIsSimulationMode(data.enabled);
    });

    socketInstance.on('simulated_objects_list', (data) => {
      setSimulatedObjects(data);
    });

    socketInstance.on('simulated_object_added', (data) => {
      if (data.success) {
        setSimulatedObjects(prev => ({
          ...prev,
          [data.obj_id]: {
            label: data.label,
            x: data.x,
            y: data.y,
            width: data.width,
            height: data.height,
            created_time: Date.now()
          }
        }));
        showNotification(`Added simulated ${data.label}`);
      }
    });

    socketInstance.on('simulated_object_removed', (data) => {
      if (data.success) {
        setSimulatedObjects(prev => {
          const newObjects = { ...prev };
          delete newObjects[data.obj_id];
          return newObjects;
        });
        showNotification("Simulated object removed");
      }
    });

    socketInstance.on('config_updated', () => {
      showNotification("Configuration updated successfully");
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const startScanning = (config: any) => {
    setIsScanning(true);
    socket?.emit('start_scanning', config);
  };

  const stopScanning = () => {
    setIsScanning(false);
    socket?.emit('stop_scanning');
  };

  const removeItem = (name: string) => {
    socket?.emit('remove_item', { name });
  };

  const clearCart = () => {
    socket?.emit('clear_cart');
  };

  const checkoutComplete = () => {
    socket?.emit('checkout_complete');
  };

  const getProducts = () => {
    socket?.emit('get_products');
  };

  const addProduct = (name: string, price: number) => {
    socket?.emit('add_product', { name, price });
  };

  const updateProduct = (name: string, price: number) => {
    socket?.emit('update_product', { name, price });
  };

  const deleteProduct = (name: string) => {
    socket?.emit('delete_product', { name });
  };

  const getTransactionHistory = () => {
    socket?.emit('get_transaction_history');
  };

  const deleteTransaction = (id: string) => {
    socket?.emit('delete_transaction', { id });
  };

  const toggleSimulation = (enabled: boolean) => {
    socket?.emit('toggle_simulation', { enabled });
  };

  const addSimulatedObject = (params: any) => {
    socket?.emit('add_simulated_object', params);
  };

  const removeSimulatedObject = (objId: string) => {
    socket?.emit('remove_simulated_object', { obj_id: objId });
  };

  const moveSimulatedObject = (objId: string, direction: string, step: number = 15) => {
    socket?.emit('move_simulated_object', { obj_id: objId, direction, step });
  };

  const moveToZone = (objId: string) => {
    socket?.emit('preset_move_to_zone', { obj_id: objId });
  };

  const updateConfig = (type: string, config: any) => {
    socket?.emit(`update_${type}_config`, config);
  };

  const applyPreset = (preset: string) => {
    socket?.emit('apply_preset_config', preset);
  };

  return {
    socket,
    isConnected,
    cart,
    total,
    products,
    transactions,
    simulatedObjects,
    isScanning,
    isSimulationMode,
    notification,
    startScanning,
    stopScanning,
    removeItem,
    clearCart,
    checkoutComplete,
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getTransactionHistory,
    deleteTransaction,
    toggleSimulation,
    addSimulatedObject,
    removeSimulatedObject,
    moveSimulatedObject,
    moveToZone,
    updateConfig,
    applyPreset,
    showNotification
  };
}