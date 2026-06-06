import * as React from 'react';

export type EnvironmentTheme = {
    leaves: string[];
};

export type FlowerPosition = {
    x: number;
    z: number;
};

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

export const nextSeededRatio = (seedRef: React.MutableRefObject<number>) => {
    seedRef.current = (seedRef.current * 1664525 + 1013904223) >>> 0;
    return seedRef.current / 4294967296;
};

export const advanceSeed = (seed: number) => (seed * 1664525 + 1013904223) >>> 0;
