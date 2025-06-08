'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';
import { CreditCard, CheckCircle } from 'lucide-react';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const socket = useSocket();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCompletePayment = () => {
    setShowSuccess(true);
    setTimeout(() => {
      socket.checkoutComplete();
      setShowSuccess(false);
      onOpenChange(false);
    }, 2000);
  };

  useEffect(() => {
    if (!open) {
      setShowSuccess(false);
    }
  }, [open]);

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-8 text-center space-y-4 mx-4 max-w-md w-full">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-600">Thank you for your purchase</p>
          <div className="w-12 h-1 bg-green-500 rounded mx-auto animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <QRCode
                  value={`PAYMENT:${socket.total}`}
                  size={180}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Scan QR code with your mobile payment app
            </p>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items:</span>
                  <span>{Object.keys(socket.cart).length}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-green-600 border-t pt-2">
                  <span>Total:</span>
                  <span>Rp {socket.total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleCompletePayment} 
              className="w-full" 
              size="lg"
              disabled={socket.total <= 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Payment
            </Button>
            
            <Button 
              onClick={() => onOpenChange(false)} 
              variant="outline" 
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}