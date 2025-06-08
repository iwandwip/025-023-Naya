'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, Trash2, Calendar, DollarSign, ShoppingBag } from 'lucide-react';
import { Transaction } from '@/lib/types';

export default function HistoryModal() {
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const getTransactionHistory = useCallback(() => {
    socket.getTransactionHistory();
  }, [socket]);

  const setDefaultDates = useCallback(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    setDateRange({
      start: formatDate(thirtyDaysAgo),
      end: formatDate(today)
    });
  }, []);

  useEffect(() => {
    if (open) {
      getTransactionHistory();
      setDefaultDates();
    }
  }, [open, getTransactionHistory, setDefaultDates]);

  const handleDateFilter = () => {
    if (dateRange.start && dateRange.end) {
      // Emit filter by date range
    } else {
      getTransactionHistory();
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      socket.deleteTransaction(id);
      setSelectedTransaction(null);
    }
  };

  const totalRevenue = socket.transactions.reduce((sum, t) => sum + t.total, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          History
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleDateFilter} className="w-full">
                    Filter
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={() => getTransactionHistory()} 
                    variant="outline" 
                    className="w-full"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <ShoppingBag className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{socket.transactions.length}</div>
                <div className="text-sm text-gray-600">Total Transactions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">Rp {totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Calendar className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {socket.transactions.length > 0 ? Math.round(totalRevenue / socket.transactions.length) : 0}
                </div>
                <div className="text-sm text-gray-600">Avg. Transaction</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {socket.transactions.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No transactions found</p>
                    </div>
                  ) : (
                    socket.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                        onClick={() => setSelectedTransaction(transaction)}
                      >
                        <div>
                          <p className="font-medium">
                            {transaction.formatted_date || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            Rp {transaction.total.toLocaleString()}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            View Details
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedTransaction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    Transaction Details
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Transaction ID</p>
                    <p className="font-mono text-xs">{selectedTransaction.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Date & Time</p>
                    <p className="font-medium">{selectedTransaction.formatted_date || 'N/A'}</p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Items Purchased</p>
                    <div className="space-y-2">
                      {selectedTransaction.items?.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="capitalize">{item.name} × {item.quantity}</span>
                          <span>Rp {item.subtotal.toLocaleString()}</span>
                        </div>
                      )) || (
                        <p className="text-gray-500 text-sm">No items recorded</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">
                      Rp {selectedTransaction.total.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}