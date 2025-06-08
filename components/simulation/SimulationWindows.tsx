'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Gamepad2, Plus, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Target, Trash2 } from 'lucide-react';
import { PRODUCT_OPTIONS } from '@/lib/constants';

export default function SimulationWindow() {
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [newObject, setNewObject] = useState({
    label: '',
    x: 50,
    y: 50,
    width: 80,
    height: 80
  });

  const handleAddObject = () => {
    if (newObject.label) {
      socket.addSimulatedObject(newObject);
      setNewObject({
        label: '',
        x: 50,
        y: 50,
        width: 80,
        height: 80
      });
    }
  };

  const handleMoveObject = (objId: string, direction: string) => {
    socket.moveSimulatedObject(objId, direction, 15);
  };

  const handleMoveToZone = (objId: string) => {
    socket.moveToZone(objId);
  };

  const handleRemoveObject = (objId: string) => {
    socket.removeSimulatedObject(objId);
  };

  const simulatedObjectEntries = Object.entries(socket.simulatedObjects);

  if (!socket.isSimulationMode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="fixed bottom-4 right-4 z-50">
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg"
            onClick={() => setOpen(true)}
          >
            <Gamepad2 className="h-4 w-4 mr-2" />
            Simulation Control
          </Button>
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-orange-500" />
            Simulation Mode Control Panel
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Virtual Object
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Product Type</Label>
                <Select
                  value={newObject.label}
                  onValueChange={(value) => setNewObject({ ...newObject, label: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_OPTIONS.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product.charAt(0).toUpperCase() + product.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>X Position</Label>
                  <Input
                    type="number"
                    value={newObject.x}
                    onChange={(e) => setNewObject({ ...newObject, x: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="640"
                  />
                </div>
                <div>
                  <Label>Y Position</Label>
                  <Input
                    type="number"
                    value={newObject.y}
                    onChange={(e) => setNewObject({ ...newObject, y: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="480"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Width</Label>
                  <Input
                    type="number"
                    value={newObject.width}
                    onChange={(e) => setNewObject({ ...newObject, width: parseInt(e.target.value) || 0 })}
                    min="20"
                    max="200"
                  />
                </div>
                <div>
                  <Label>Height</Label>
                  <Input
                    type="number"
                    value={newObject.height}
                    onChange={(e) => setNewObject({ ...newObject, height: parseInt(e.target.value) || 0 })}
                    min="20"
                    max="200"
                  />
                </div>
              </div>

              <Button 
                onClick={handleAddObject}
                className="w-full"
                disabled={!newObject.label}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Virtual Object
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Virtual Objects</CardTitle>
            </CardHeader>
            <CardContent>
              {simulatedObjectEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No virtual objects</p>
                  <p className="text-sm">Add objects to test detection</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {simulatedObjectEntries.map(([objId, obj]) => (
                    <div key={objId} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="capitalize">
                            {obj.label}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            Position: ({obj.x}, {obj.y}) Size: {obj.width}×{obj.height}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveObject(objId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveObject(objId, 'up')}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveObject(objId, 'left')}
                          >
                            <ArrowLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMoveToZone(objId)}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <Target className="h-3 w-3 mr-1" />
                            Zone
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveObject(objId, 'right')}
                          >
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveObject(objId, 'down')}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Gamepad2 className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Simulation Mode Instructions</h4>
              <p className="text-sm text-orange-700 mt-1">
                Add virtual objects to test the detection system without real products. 
                Use movement controls to simulate objects passing through the counting zone.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}