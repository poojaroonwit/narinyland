"use client";

import React from "react";
import Whiteboard from "@/components/Whiteboard";

export default function WhiteboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070514] p-6 lg:p-12 relative">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-full h-full bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Narinyland <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Board</span>
        </h1>
        <p className="text-white/60 text-sm md:text-base mb-8 max-w-2xl text-center font-light">
          Sketch ideas, collaborate visually, or bring in concepts for your Narinyland tree world.
        </p>
        
        <div className="w-full">
          <Whiteboard />
        </div>
      </div>
    </div>
  );
}
