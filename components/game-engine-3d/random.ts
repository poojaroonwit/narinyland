"use client";

import * as React from 'react';

export const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const seededRatio = (seed: number) => {
  const value = Math.sin(seed * 9301 + 49297) * 233280;
  return value - Math.floor(value);
};

export const seededRandom = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export const advanceSeed = (seed: number) => (seed * 1664525 + 1013904223) >>> 0;

export const nextSeededRatio = (seedRef: React.MutableRefObject<number>) => {
  seedRef.current = advanceSeed(seedRef.current);
  return seedRef.current / 4294967296;
};
