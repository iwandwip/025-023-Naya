'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Camera, Gamepad2, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL, DEFAULT_CONFIG } from '@/lib/constants';

export default function ScannerView() {
  const socket = useSocket();
  const [imageKey, setImageKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastErrorTime, setLastErrorTime] = useState(0);

  useEffect(() => {
    setIsClient(true);
    setImageKey(Date.now());
  }, []);

  useEffect(() => {
    if (socket.isScanning && imageLoaded) {
      const interval = setInterval(() => {
        setImageKey(Date.now());
      }, 200);
      return () => clearInterval(interval);
    }
  }, [socket.isScanning, imageLoaded]);

  const handleStartScanning = () => {
    setImageError(false);
    setImageLoaded(false);
    socket.startScanning(DEFAULT_CONFIG.detection);
  };

  const handleStopScanning = () => {
    socket.stopScanning();
  };

  const handleSimulationToggle = (enabled: boolean) => {
    socket.toggleSimulation(enabled);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
    setRetryCount(0);
  };

  const handleImageError = () => {
    const now = Date.now();
    if (now - lastErrorTime > 5000) {
      setRetryCount(0);
    }
    
    setImageError(true);
    setImageLoaded(false);
    setRetryCount(prev => prev + 1);
    setLastErrorTime(now);
    
    if (retryCount < 3) {
      setTimeout(() => {
        setImageKey(Date.now());
        setImageError(false);
      }, 2000 * (retryCount + 1));
    }
  };

  const handleRetryConnection = () => {
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
    setImageKey(Date.now());
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

  const videoFeedUrl = `${API_BASE_URL}/video_feed?t=${imageKey}`;

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
            {socket.isScanning && imageLoaded && (
              <Badge variant="secondary" className="animate-pulse">
                Scanning...
              </Badge>
            )}
            {imageError && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Feed Error
              </Badge>
            )}
            {!imageLoaded && !imageError && socket.isConnected && (
              <Badge variant="outline" className="animate-pulse">
                Loading...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="relative">
          {!imageError && (
            <img
              key={`video-${imageKey}`}
              src={videoFeedUrl}
              alt="Detection Feed"
              className="w-full h-96 object-cover rounded-lg border bg-gray-100"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                maxWidth: '100%',
                height: '384px',
                display: 'block'
              }}
            />
          )}
          
          {imageError && (
            <div className="w-full h-96 bg-gray-100 rounded-lg border flex flex-col items-center justify-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-gray-600 text-center mb-2">Camera feed unavailable</p>
              <p className="text-sm text-gray-500 text-center max-w-sm mb-2">
                Backend: {API_BASE_URL}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-gray-400 mb-4">
                  Retry attempt: {retryCount}/3
                </p>
              )}
              <Button 
                onClick={handleRetryConnection} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </Button>
            </div>
          )}
          
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-100 rounded-lg border flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">Loading video feed...</p>
                <p className="text-xs text-gray-500 mt-1">{API_BASE_URL}/video_feed</p>
              </div>
            </div>
          )}
          
          {socket.isSimulationMode && (
            <div className="absolute top-2 left-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                <Gamepad2 className="h-3 w-3 mr-1" />
                Simulation Mode
              </Badge>
            </div>
          )}
          
          {imageLoaded && (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Live Feed
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
          
          <Button
            onClick={handleRetryConnection}
            disabled={!imageError}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Feed
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
          ) : imageError ? (
            <p>❌ Camera feed error. Check backend connection and camera availability</p>
          ) : !imageLoaded ? (
            <p>📡 Connecting to video feed...</p>
          ) : (
            <p>📷 Ready to scan. Press "Start Scanning" to begin detection</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}