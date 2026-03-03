"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Point {
  x: number;
  y: number;
}

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas dimensions to match display size
    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      // Only resize if the dimensions actually changed
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        // Save current content
        const currentContent = canvas.toDataURL();
        
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          setContext(ctx);
          
          // Restore content if exists
          if (currentContent && currentContent !== 'data:,') {
             const img = new window.Image();
             img.onload = () => ctx.drawImage(img, 0, 0);
             img.src = currentContent;
          } else {
             ctx.fillStyle = "#ffffff";
             ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    // Set up fullscreen listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Wait a tick for layout to update before resizing
      setTimeout(resizeCanvas, 50);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (context) {
      context.beginPath(); // Reset path so next dot isn't connected
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context || !canvasRef.current) return;

    let clientX, clientY;
    
    // Handle both mouse and touch events
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    context.lineWidth = brushSize;
    context.strokeStyle = color;

    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !context || !canvasRef.current) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Draw image in center of canvas, scaling if necessary
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        // Scale down if image is larger than canvas
        if (targetWidth > canvas.width || targetHeight > canvas.height) {
          const ratio = Math.min(canvas.width / targetWidth, canvas.height / targetHeight) * 0.8; // 80% coverage max
          targetWidth *= ratio;
          targetHeight *= ratio;
        }
        
        const x = (canvas.width - targetWidth) / 2;
        const y = (canvas.height - targetHeight) / 2;
        
        context.drawImage(img, x, y, targetWidth, targetHeight);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/40 backdrop-blur-xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'w-full h-[600px] my-8'
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-black/60 border-b border-white/10 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-sm font-medium">Color:</span>
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
              title="Select brush color"
            />
          </div>
          
          <div className="flex items-center gap-2 hidden sm:flex">
            <span className="text-white/80 text-sm font-medium">Size:</span>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 accent-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-sm font-medium rounded-lg transition-colors border border-purple-500/30">
            Upload Image
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </label>
          
          <button 
            onClick={clearCanvas}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 text-sm font-medium rounded-lg transition-colors border border-red-500/30"
          >
            Clear
          </button>
          
          <button 
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 text-sm font-medium rounded-lg transition-colors border border-blue-500/30"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-white overflow-hidden touch-none cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          onTouchMove={draw}
          className="absolute inset-0 w-full h-full block"
        />
        
        {/* Placeholder label indicating collaboration backend needs to be connected */}
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-none flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-white/80 text-xs font-medium">Local Mode (Socket.io Ready)</span>
        </div>
      </div>
    </div>
  );
}
