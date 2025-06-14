'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Camera, Gamepad2, Power, Loader2 } from 'lucide-react';
import { DEFAULT_CONFIG } from '@/lib/constants';
import VideoPlayer from './VideoPlayer';

export default function ScannerView() {
  const socket = useSocket();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleStartScanning = () => {
    socket.startScanning(DEFAULT_CONFIG.detection);
  };

  const handleStopScanning = () => {
    socket.stopScanning();
  };

  const handleSimulationToggle = (enabled: boolean) => {
    socket.toggleSimulation(enabled);
  };

  const handleCameraToggle = (enabled: boolean) => {
    socket.toggleCamera(enabled);
  };

  const handleInitializeYolo = () => {
    socket.initializeYolo();
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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Real-time MJPEG Stream
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={socket.isConnected ? "default" : "destructive"}>
              {socket.isConnected ? "Connected" : "Disconnected"}
            </Badge>
            
            <Badge variant={socket.cameraEnabled ? "default" : "secondary"}>
              Camera: {socket.cameraEnabled ? "ON" : "OFF"}
            </Badge>
            
            {socket.yoloInitializing && (
              <Badge variant="outline" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                YOLO Loading...
              </Badge>
            )}
            
            {socket.yoloInitialized && (
              <Badge variant="default">
                YOLO Ready
              </Badge>
            )}
            
            {socket.isScanning && (
              <Badge variant="secondary" className="animate-pulse">
                Scanning...
              </Badge>
            )}
            
            <Badge variant="outline" className="text-xs">
              iframe method
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        <div className="relative w-full">
          <VideoPlayer
            isConnected={socket.isConnected}
            isScanning={socket.isScanning}
          />
          
          {socket.isSimulationMode && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                <Gamepad2 className="h-3 w-3 mr-1" />
                Simulation Mode
              </Badge>
            </div>
          )}
          
          {socket.isConnected && (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                MJPEG Live
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <Button
            onClick={() => handleCameraToggle(!socket.cameraEnabled)}
            disabled={!socket.isConnected || socket.yoloInitializing}
            variant={socket.cameraEnabled ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            <Power className="h-4 w-4" />
            {socket.cameraEnabled ? "Matikan Kamera" : "Hidupkan Kamera"}
          </Button>
          
          {!socket.yoloInitialized && !socket.yoloInitializing && (
            <Button
              onClick={handleInitializeYolo}
              disabled={!socket.isConnected}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Loader2 className="h-4 w-4" />
              Inisialisasi YOLO
            </Button>
          )}
          
          <Button
            onClick={handleStartScanning}
            disabled={socket.isScanning || !socket.isConnected || !socket.cameraEnabled || !socket.yoloInitialized}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Mulai Pemindaian
          </Button>
          
          <Button
            onClick={handleStopScanning}
            disabled={!socket.isScanning}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Hentikan Pemindaian
          </Button>
        </div>

        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="simulation-mode" className="text-sm font-medium">
                  Mode Simulasi
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktifkan untuk pengujian tanpa input kamera asli
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

        <div className="text-center text-sm text-muted-foreground">
          {socket.yoloInitializing ? (
            <p>⏳ Menginisialisasi model YOLO... Mohon tunggu</p>
          ) : !socket.yoloInitialized ? (
            <p>🤖 YOLO belum diinisialisasi. Klik &ldquo;Inisialisasi YOLO&rdquo; untuk memulai</p>
          ) : !socket.cameraEnabled ? (
            <p>📷 Kamera dinonaktifkan. Klik &ldquo;Hidupkan Kamera&rdquo; untuk mengaktifkan</p>
          ) : socket.isScanning ? (
            <p>🔍 Memindai produk... Letakkan item di sabuk konveyor</p>
          ) : !socket.isConnected ? (
            <p>❌ WebSocket disconnected. Check backend connection</p>
          ) : (
            <p>📷 Ready to scan. Press &ldquo;Start Scanning&rdquo; to begin detection</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}