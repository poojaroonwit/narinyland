"use client";

import { Emotion } from '../../types';

export const THEMES: Record<string, any> = {
  oak: {
    trunk: '#8B4513',
    leaves: ['#4ade80', '#22c55e', '#16a34a', '#15803d'],
    bg: '#f0fdf4',
    ground: '#65a30d',
    patch: '#4d7c0f',
    particle: '#22c55e'
  },
  sakura: {
    trunk: '#5D4037',
    leaves: ['#f472b6', '#f9a8d4', '#fbcfe8', '#ec4899'],
    bg: '#fee2e2',
    ground: '#f9a8d4',
    patch: '#f472b6', // Darker pink patches
    particle: '#f472b6'
  },
  neon: {
    trunk: '#4c1d95',
    leaves: ['#22d3ee', '#818cf8', '#c084fc', '#e879f9'],
    bg: '#0f172a',
    ground: '#1e1b4b',
    patch: '#2e1065',
    particle: '#c084fc'
  },
  frozen: {
    trunk: '#475569',
    leaves: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'],
    bg: '#f0f9ff',
    ground: '#e0f2fe',
    patch: '#93c5fd',
    particle: '#38bdf8'
  },
  golden: {
    trunk: '#78350f',
    leaves: ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706'],
    bg: '#fffbeb',
    ground: '#fde68a',
    patch: '#b45309',
    particle: '#f59e0b'
  },
  midnight: {
    trunk: '#2d3436',
    leaves: ['#a29bfe', '#6c5ce7', '#fd79a8', '#e84393'],
    bg: '#1e1e2e',
    ground: '#2d2b55',
    patch: '#1e1b4b',
    particle: '#fd79a8'
  }
};
