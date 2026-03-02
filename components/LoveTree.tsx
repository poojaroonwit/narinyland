"use client";

import * as React from 'react';

import LoveTree3D from './LoveTree3D';
import { Emotion } from '../types';

interface LoveTreeProps {
  anniversaryDate: string;
  treeStyle?: string;
  petEmotion: Emotion;
  petMessage: string;
  level: number;
  daysPerTree: number;
  daysPerFlower?: number;
  flowerType?: string;
  mixedFlowers?: string[];
  // viewMode is deprecated but kept for compatibility for now
  viewMode?: string;
  leaves: number;
  points: number;
  onAddLeaf: () => void;
  skyMode?: string;
  showQRCode?: boolean;
  petType?: string;
  pets?: Array<{ id: string; type: string; name?: string }>;
  albums?: Array<{ id: string; name: string }>;
  graphicsQuality?: 'low' | 'medium' | 'high';
}

const LoveTree: React.FC<LoveTreeProps> = (props) => {
  return <LoveTree3D {...props} />;
};

export default LoveTree;
