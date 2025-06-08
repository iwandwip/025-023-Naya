'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationProps {
  message: string | null;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export default function Notification({ 
  message, 
  type = 'success', 
  duration = 3000 
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!message) return null;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
        type === 'success' && "bg-green-100 text-green-800 border border-green-200",
        type === 'error' && "bg-red-100 text-red-800 border border-red-200",
        type === 'info' && "bg-blue-100 text-blue-800 border border-blue-200"
      )}
    >
      <CheckCircle className="h-5 w-5" />
      <span className="font-medium">{message}</span>
      <button
        onClick={() => setIsVisible(false)}
        className="ml-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}