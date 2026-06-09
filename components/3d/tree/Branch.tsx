"use client";

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { InstancedLeaves } from './InstancedLeaves';
import { LeafInstance, TreeTheme, getSeasonalLeafColor, seededRandom } from './shared';
import { useGameLoop } from '../../game-engine-3d';

export const Branch = ({ position, yAngle, tilt, length, thickness, color, theme, leafCount, windFactor, quality = 'medium', detail = 'high', seed = 0, curveAmount = 0, curveDirection = 0, season = 'spring' }: { 
    position: [number, number, number], 
    yAngle: number,
    tilt: number,
    length: number,
    thickness: number,
    color: string,
    theme: TreeTheme,
    leafCount: number,
    windFactor: number,
    quality?: string,
    detail?: 'high' | 'medium' | 'low',
    seed?: number,
    curveAmount?: number,
    curveDirection?: number,
    season?: string
}) => {
    const branchRef = useRef<THREE.Group>(null);
    const stableSeed = useMemo(() => seed, [seed]);

    useGameLoop((state) => {
        if (branchRef.current && quality !== 'low') {
            const t = state.clock.getElapsedTime();
            const sway = Math.sin(t * 0.6 + stableSeed) * (0.03 * windFactor);
            branchRef.current.rotation.x = tilt + sway;
            branchRef.current.rotation.z = Math.cos(t * 0.5 + stableSeed) * (0.02 * windFactor);
        }
    });

    // Generate leaf cluster at end of branch — spread along branch and at tip
    const branchLeaves = useMemo(() => {
        const pos: LeafInstance[] = [];
        const effectiveCount = quality === 'low' ? Math.floor(leafCount * 0.5) : leafCount;
        
        for(let i = 0; i < effectiveCount; i++) {
            const r1 = seededRandom(i * 3.17 + seed);
            const r2 = seededRandom(i * 7.31 + seed + 100);
            const r3 = seededRandom(i * 13.37 + seed + 200);
            const r4 = seededRandom(i * 17.71 + seed + 300);
            const r5 = seededRandom(i * 23.53 + seed + 400);

            // 85% of leaves at branch tip cluster, 15% along the branch (prioritize tips)
            const atTip = r5 > 0.15;
            let lx: number, ly: number, lz: number;
            
            if (atTip) {
                // Tip cluster — dense dome around branch tip
                const clusterRadius = 0.12 + r1 * 0.18;
                const theta = r2 * Math.PI * 2;
                const phi = r3 * Math.PI * 0.65;
                lx = Math.sin(phi) * Math.cos(theta) * clusterRadius;
                ly = length * 0.9 + Math.cos(phi) * clusterRadius * 0.25;
                lz = Math.sin(phi) * Math.sin(theta) * clusterRadius;
            } else {
                // Along branch — very close to the wood
                const branchT = 0.5 + r1 * 0.4;
                const spreadAngle = r2 * Math.PI * 2;
                const spreadDist = 0.03 + r3 * 0.08;
                lx = Math.cos(spreadAngle) * spreadDist;
                ly = length * branchT;
                lz = Math.sin(spreadAngle) * spreadDist;
            }

            pos.push({
                position: [lx, ly, lz] as [number, number, number],
                scale: 0.20 + r1 * 0.25,
                color: getSeasonalLeafColor(theme.leaves[Math.floor(r2 * theme.leaves.length)], season),
                offset: r3 * Math.PI * 2,
                rotX: r4 * Math.PI * 2,
                rotY: r2 * Math.PI * 2,
                rotZ: r5 * Math.PI * 2,
                windSensitivity: 0.5 + seededRandom(i * 37.3) * 1.5,
                flutterSpeed: 0.8 + seededRandom(i * 41.7) * 1.2,
                turbulence: seededRandom(i * 29.1) * 0.3
            });
        }
        return pos;
    }, [leafCount, length, quality, theme.leaves, season, seed]);

    // Leaves for sub-branches (twigs) - concentrated at twig tips
    const subBranchLeaves1 = useMemo(() => {
        const leaves: LeafInstance[] = [];
        const twigCount = quality === 'low' ? 4 : (quality === 'medium' ? 8 : 12);
        
        for(let i = 0; i < twigCount; i++) {
            const r1 = seededRandom(i * 3.17 + seed + 1000);
            const r2 = seededRandom(i * 7.31 + seed + 1100);
            const r3 = seededRandom(i * 13.37 + seed + 1200);
            
            // Leaves concentrated at twig tip
            const tipRadius = 0.05 + r1 * 0.08;
            const theta = r2 * Math.PI * 2;
            const phi = r3 * Math.PI * 0.5;
            
            leaves.push({
                position: [
                    0.1 + curveAmount * 0.2 + Math.sin(phi) * Math.cos(theta) * tipRadius,
                    length * 0.5 + length * 0.4 * 0.9 + Math.cos(phi) * tipRadius * 0.2,
                    0.05 + curveAmount * 0.1 + Math.sin(phi) * Math.sin(theta) * tipRadius
                ] as [number, number, number],
                scale: 0.12 + r1 * 0.15,
                color: getSeasonalLeafColor(theme.leaves[Math.floor(r2 * theme.leaves.length)], season),
                offset: r3 * Math.PI * 2,
                rotX: r1 * Math.PI * 2,
                rotY: r2 * Math.PI * 2,
                rotZ: r3 * Math.PI * 2,
                windSensitivity: 0.8 + seededRandom(i * 43.7) * 0.8,
                flutterSpeed: 1.2 + seededRandom(i * 47.1) * 0.8,
                turbulence: seededRandom(i * 31.9) * 0.3
            });
        }
        return leaves;
    }, [length, quality, theme.leaves, season, seed, curveAmount]);

    const subBranchLeaves2 = useMemo(() => {
        const leaves: LeafInstance[] = [];
        const twigCount = quality === 'low' ? 4 : (quality === 'medium' ? 8 : 12);
        
        for(let i = 0; i < twigCount; i++) {
            const r1 = seededRandom(i * 3.17 + seed + 2000);
            const r2 = seededRandom(i * 7.31 + seed + 2100);
            const r3 = seededRandom(i * 13.37 + seed + 2200);
            
            // Leaves concentrated at twig tip
            const tipRadius = 0.05 + r1 * 0.08;
            const theta = r2 * Math.PI * 2;
            const phi = r3 * Math.PI * 0.5;
            
            leaves.push({
                position: [
                    -0.05 + curveAmount * 0.1 + Math.sin(phi) * Math.cos(theta) * tipRadius,
                    length * 0.65 + length * 0.3 * 0.9 + Math.cos(phi) * tipRadius * 0.2,
                    -0.08 + curveAmount * 0.15 + Math.sin(phi) * Math.sin(theta) * tipRadius
                ] as [number, number, number],
                scale: 0.12 + r1 * 0.15,
                color: getSeasonalLeafColor(theme.leaves[Math.floor(r2 * theme.leaves.length)], season),
                offset: r3 * Math.PI * 2,
                rotX: r1 * Math.PI * 2,
                rotY: r2 * Math.PI * 2,
                rotZ: r3 * Math.PI * 2,
                windSensitivity: 0.8 + seededRandom(i * 43.7) * 0.8,
                flutterSpeed: 1.2 + seededRandom(i * 47.1) * 0.8,
                turbulence: seededRandom(i * 31.9) * 0.3
            });
        }
        return leaves;
    }, [length, quality, theme.leaves, season, seed, curveAmount]);

    const isLow = detail === 'low' || quality === 'low';

    return (
        <group position={position} rotation={[0, yAngle, 0]}>
        <group ref={branchRef} rotation={[tilt, 0, 0]}>
            {/* Curved branch segments */}
            <mesh position={[0, length * 0.25, curveAmount * length * 0.3]} rotation={[curveAmount * 0.2, curveDirection, 0]} castShadow={!isLow}>
                <cylinderGeometry args={[thickness * 0.5, thickness, length * 0.5, isLow ? 4 : 8]} />
                <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            {/* Tapered upper segment with curve */}
            <mesh position={[curveAmount * length * 0.15, length * 0.6, curveAmount * length * 0.5]} rotation={[0.05 + curveAmount * 0.3, curveDirection * 0.5, 0.03]} castShadow receiveShadow>
                <cylinderGeometry args={[thickness * 0.2, thickness * 0.5, length * 0.4, isLow ? 4 : 6]} />
                <meshStandardMaterial color={color} roughness={0.9} />
            </mesh>
            {/* Curved sub-branches (twigs) with leaves */}
            {!isLow && (
                <>
                    <group>
                        <mesh position={[0.1 + curveAmount * 0.2, length * 0.5, 0.05 + curveAmount * 0.1]} rotation={[0.4 + curveAmount, 0.8 + curveDirection * 0.3, 0.3]} castShadow={false}>
                            <cylinderGeometry args={[0.005, thickness * 0.2, length * 0.4, 4]} />
                            <meshStandardMaterial color={color} roughness={0.9} />
                        </mesh>
                        {/* Leaves on first sub-branch */}
                        <InstancedLeaves leaves={subBranchLeaves1} windFactor={windFactor} quality={quality} />
                    </group>
                    <group>
                        <mesh position={[-0.05 + curveAmount * 0.1, length * 0.65, -0.08 + curveAmount * 0.15]} rotation={[-0.3 + curveAmount * 0.2, -0.6 + curveDirection * 0.4, -0.2]} castShadow={false}>
                            <cylinderGeometry args={[0.005, thickness * 0.15, length * 0.3, 4]} />
                            <meshStandardMaterial color={color} roughness={0.9} />
                        </mesh>
                        {/* Leaves on second sub-branch */}
                        <InstancedLeaves leaves={subBranchLeaves2} windFactor={windFactor} quality={quality} />
                    </group>
                </>
            )}

            <InstancedLeaves leaves={branchLeaves} windFactor={windFactor} quality={isLow ? 'low' : quality} />
        </group>
        </group>
    );
};
