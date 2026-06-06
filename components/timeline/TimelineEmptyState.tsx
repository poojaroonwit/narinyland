"use client";

import React from 'react';

type TimelineEmptyStateProps = {
  onAddNew: () => void;
};

export const TimelineEmptyState: React.FC<TimelineEmptyStateProps> = ({ onAddNew }) => (
  <div className="flex flex-col items-center justify-center p-20 text-center">
    <div className="text-6xl mb-4">✨</div>
    <h2 className="font-pacifico text-3xl text-gray-400 mb-4">Your Story Begins Here</h2>
    <button onClick={onAddNew} className="bg-pink-500 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-transform">
      Start Planning
    </button>
  </div>
);
