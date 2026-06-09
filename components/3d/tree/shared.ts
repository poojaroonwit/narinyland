import * as THREE from 'three';
import { seededRandom } from '../../game-engine-3d';

export type TreeTheme = {
  trunk: string;
  leaves: string[];
};

export type LeafInstance = {
  position: [number, number, number];
  scale: number;
  color: string;
  offset: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  windSensitivity: number;
  flutterSpeed: number;
  turbulence: number;
};

export type TreeContentProps = {
  theme: TreeTheme;
  scale?: number;
  leafCount: number;
  windFactor?: number;
  branchCount?: number;
  quality?: string;
  shake?: boolean;
  detail?: 'high' | 'medium' | 'low';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  treeHeight?: number;
};

export { seededRandom };

export function getSeasonalLeafColor(baseColor: string, season: string): string {
    const color = new THREE.Color(baseColor);
    switch (season) {
        case 'spring':
            // Fresh, vibrant greens
            return color.multiplyScalar(1.1).getStyle();
        case 'summer':
            // Rich, deep greens
            return color.multiplyScalar(0.95).getStyle();
        case 'autumn':
            // Warm oranges, yellows, reds
            if (baseColor.includes('green')) {
                return new THREE.Color('#d4a574').getStyle();
            } else if (baseColor.includes('pink')) {
                return new THREE.Color('#ff6b9d').getStyle();
            }
            return new THREE.Color('#ff9a3d').getStyle();
        case 'winter':
            // Cool, muted colors
            return color.multiplyScalar(0.7).getStyle();
        default:
            return baseColor;
    }
}
