'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Camera, Gamepad2 } from 'lucide-react';
import { API_BASE_URL, DEFAULT_CONFIG } from '@/lib/constants';
import Image from 'next/image';

export default function ScannerView() {
  const socket = useSocket();
  const [imageKey, setImageKey] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setImageKey(Date.now().toString());
  }, []);

  useEffect(() => {
    if (socket.isScanning) {
      const interval = setInterval(() => {
        setImageKey(Date.now().toString());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [socket.isScanning]);

  const handleStartScanning = () => {
    socket.startScanning(DEFAULT_CONFIG.detection);
  };

  const handleStopScanning = () => {
    socket.stopScanning();
  };

  const handleSimulationToggle = (enabled: boolean) => {
    socket.toggleSimulation(enabled);
  };

  if (!isClient) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Live Detection Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96 bg-gray-100 rounded-lg border flex items-center justify-center">
            <div className="text-gray-500">Loading camera feed...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Live Detection Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={socket.isConnected ? "default" : "destructive"}>
              {socket.isConnected ? "Connected" : "Disconnected"}
            </Badge>
            {socket.isScanning && (
              <Badge variant="secondary" className="animate-pulse">
                Scanning...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="relative">
          <Image
            key={imageKey}
            src={`${API_BASE_URL}/video_feed?t=${imageKey}`}
            alt="Detection Feed"
            width={640}
            height={480}
            className="w-full h-96 object-cover rounded-lg border bg-gray-100"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQwIiBoZWlnaHQ9IjQ4MCIgdmlld0JveD0iMCAwIDY0MCA0ODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI2NDAiIGhlaWdodD0iNDgwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjMyMCIgeT0iMjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LXNpemU9IjE2Ij5DYW1lcmEgTm90IEF2YWlsYWJsZTwvdGV4dD4KPC9zdmc+';
            }}
            unoptimized
            priority
          />
          
          {socket.isSimulationMode && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                <Gamepad2 className="h-3 w-3 mr-1" />
                Simulation Mode
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleStartScanning}
            disabled={socket.isScanning || !socket.isConnected}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start Scanning
          </Button>
          
          <Button
            onClick={handleStopScanning}
            disabled={!socket.isScanning}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Scanning
          </Button>
        </div>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simulation-mode" className="text-sm font-medium">
                  Simulation Mode
                </Label>
                <p className="text-xs text-gray-600 mt-1">
                  Enable to test without real camera input
                </p>
              </div>
              <Switch
                id="simulation-mode"
                checked={socket.isSimulationMode}
                onCheckedChange={handleSimulationToggle}
              />
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          {socket.isScanning ? (
            <p>🔍 Scanning for products... Place items on the conveyor belt</p>
          ) : (
            <p>📷 Ready to scan. Press &quot;Start Scanning&quot; to begin detection</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}