'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableWindowProps {
  title: string;
  icon?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: string; height: string };
  minWidth?: string;
  minHeight?: string;
  resizable?: boolean;
}

export default function DraggableWindow({
  title,
  icon,
  isOpen,
  onClose,
  children,
  className,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: '800px', height: '600px' },
  minWidth = '400px',
  minHeight = '300px',
  resizable = true,
}: DraggableWindowProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previousState, setPreviousState] = useState({ position, size });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Keep window within viewport bounds
      const maxX = window.innerWidth - (windowRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (windowRef.current?.offsetHeight || 0);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-controls')) return;
    
    const rect = windowRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const toggleMaximize = () => {
    if (isMaximized) {
      setPosition(previousState.position);
      setSize(previousState.size);
    } else {
      setPreviousState({ position, size });
      setPosition({ x: 0, y: 0 });
      setSize({ width: '100vw', height: '100vh' });
    }
    setIsMaximized(!isMaximized);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Draggable window */}
      <Card
        ref={windowRef}
        className={cn(
          "fixed z-50 shadow-2xl bg-white/95 backdrop-blur-md border-gray-200",
          "transition-shadow duration-200",
          isDragging ? "shadow-3xl cursor-move" : "hover:shadow-2xl",
          isMaximized && "rounded-none",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: isMaximized ? '100vw' : size.width,
          height: isMaximized ? '100vh' : size.height,
          minWidth: isMaximized ? 'auto' : minWidth,
          minHeight: isMaximized ? 'auto' : minHeight,
          resize: resizable && !isMaximized ? 'both' : 'none',
          overflow: 'auto',
        }}
      >
        {/* Window header */}
        <div
          className={cn(
            "flex items-center justify-between p-4 border-b",
            "bg-gradient-to-r from-gray-50 to-gray-100",
            "cursor-move select-none",
            isMaximized && "cursor-default"
          )}
          onMouseDown={!isMaximized ? handleMouseDown : undefined}
        >
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          
          <div className="window-controls flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="h-8 w-8 hover:bg-gray-200"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Window content */}
        <div className="p-4 overflow-auto" style={{ height: 'calc(100% - 60px)' }}>
          {children}
        </div>

        {/* Resize handle indicator */}
        {resizable && !isMaximized && (
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize">
            <svg
              className="w-full h-full text-gray-400"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M13 13H3v-2h10v2zm0-4H7v-2h6v2zm0-4h-2V3h2v2z" />
            </svg>
          </div>
        )}
      </Card>
    </>
  );
}