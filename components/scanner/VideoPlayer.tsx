'use client';

import { useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/constants';

interface VideoPlayerProps {
  isConnected: boolean;
  isScanning: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export default function VideoPlayer({ isConnected, isScanning, onLoad, onError }: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const streamUrl = `${API_BASE_URL}/video_feed`;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isConnected) return;

    // Force reload iframe with cache-busting
    iframe.src = streamUrl + '?t=' + Date.now();
    
    // Simple load detection
    const loadTimer = setTimeout(() => {
      onLoad?.();
      console.log('✅ MJPEG iframe loaded');
    }, 1000);

    return () => clearTimeout(loadTimer);
  }, [isConnected, streamUrl, onLoad]);

  if (!isConnected) {
    return (
      <div className="relative w-full aspect-[4/3] max-h-[60vh] rounded-lg border bg-gray-200 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">❌ Server disconnected</p>
          <p className="text-xs text-gray-500 mt-1">Check backend connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] max-h-[60vh] rounded-lg border bg-gray-100 overflow-hidden">
      <iframe
        ref={iframeRef}
        src={streamUrl}
        className="w-full h-full"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: '#f0f0f0',
          objectFit: 'contain',
          display: 'block'
        }}
        title="Live Video Feed"
        allow="camera"
        sandbox="allow-same-origin"
        scrolling="no"
        frameBorder="0"
      />
    </div>
  );
}