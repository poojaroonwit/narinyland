"use client";

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const SkyDome = ({ hour }: { skyColor: string, hour: number, quality?: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    // 3-color gradient: zenith (top), mid (middle band), horizon (bottom)
    const { zenithColor, midColor, horizonColor } = useMemo(() => {
        // Deep night
        if (hour >= 21 || hour < 4.5) return {
            zenithColor: '#020810',
            midColor: '#0a1628',
            horizonColor: '#111d35'
        };
        // Pre-dawn (4:30-5:30)
        if (hour >= 4.5 && hour < 5.5) {
            const t = (hour - 4.5) / 1.0;
            return {
                zenithColor: new THREE.Color('#020810').lerp(new THREE.Color('#0c1225'), t).getStyle(),
                midColor: new THREE.Color('#0a1628').lerp(new THREE.Color('#1c2340'), t).getStyle(),
                horizonColor: new THREE.Color('#111d35').lerp(new THREE.Color('#8b5e3c'), t).getStyle()
            };
        }
        // Dawn twilight (5:30-6:15)
        if (hour >= 5.5 && hour < 6.25) {
            const t = (hour - 5.5) / 0.75;
            return {
                zenithColor: new THREE.Color('#0c1225').lerp(new THREE.Color('#1a2744'), t).getStyle(),
                midColor: new THREE.Color('#1c2340').lerp(new THREE.Color('#5c6b8a'), t).getStyle(),
                horizonColor: new THREE.Color('#8b5e3c').lerp(new THREE.Color('#d4956b'), t).getStyle()
            };
        }
        // Sunrise (6:15-7:30)
        if (hour >= 6.25 && hour < 7.5) {
            const t = (hour - 6.25) / 1.25;
            return {
                zenithColor: new THREE.Color('#1a2744').lerp(new THREE.Color('#2a5a8f'), t).getStyle(),
                midColor: new THREE.Color('#5c6b8a').lerp(new THREE.Color('#7dabc4'), t).getStyle(),
                horizonColor: new THREE.Color('#d4956b').lerp(new THREE.Color('#b8d4e3'), t).getStyle()
            };
        }
        // Morning (7:30-10:00)
        if (hour >= 7.5 && hour < 10) {
            const t = (hour - 7.5) / 2.5;
            return {
                zenithColor: new THREE.Color('#2a5a8f').lerp(new THREE.Color('#1e56a0'), t).getStyle(),
                midColor: new THREE.Color('#7dabc4').lerp(new THREE.Color('#6ba3cc'), t).getStyle(),
                horizonColor: new THREE.Color('#b8d4e3').lerp(new THREE.Color('#c4dce8'), t).getStyle()
            };
        }
        // Midday (10:00-15:00)
        if (hour >= 10 && hour < 15) return {
            zenithColor: '#1e56a0',
            midColor: '#5a9ac4',
            horizonColor: '#c4dce8'
        };
        // Afternoon (15:00-17:00)
        if (hour >= 15 && hour < 17) {
            const t = (hour - 15) / 2.0;
            return {
                zenithColor: new THREE.Color('#1e56a0').lerp(new THREE.Color('#2d5f8a'), t).getStyle(),
                midColor: new THREE.Color('#5a9ac4').lerp(new THREE.Color('#8aadbe'), t).getStyle(),
                horizonColor: new THREE.Color('#c4dce8').lerp(new THREE.Color('#d4c4a0'), t).getStyle()
            };
        }
        // Golden hour (17:00-18:30)
        if (hour >= 17 && hour < 18.5) {
            const t = (hour - 17) / 1.5;
            return {
                zenithColor: new THREE.Color('#2d5f8a').lerp(new THREE.Color('#1a2040'), t).getStyle(),
                midColor: new THREE.Color('#8aadbe').lerp(new THREE.Color('#8b6050'), t).getStyle(),
                horizonColor: new THREE.Color('#d4c4a0').lerp(new THREE.Color('#c46030'), t).getStyle()
            };
        }
        // Sunset (18:30-19:30)
        if (hour >= 18.5 && hour < 19.5) {
            const t = (hour - 18.5) / 1.0;
            return {
                zenithColor: new THREE.Color('#1a2040').lerp(new THREE.Color('#0e1225'), t).getStyle(),
                midColor: new THREE.Color('#8b6050').lerp(new THREE.Color('#3a2545'), t).getStyle(),
                horizonColor: new THREE.Color('#c46030').lerp(new THREE.Color('#4a2040'), t).getStyle()
            };
        }
        // Dusk (19:30-21:00)
        if (hour >= 19.5 && hour < 21) {
            const t = (hour - 19.5) / 1.5;
            return {
                zenithColor: new THREE.Color('#0e1225').lerp(new THREE.Color('#020810'), t).getStyle(),
                midColor: new THREE.Color('#3a2545').lerp(new THREE.Color('#0a1628'), t).getStyle(),
                horizonColor: new THREE.Color('#4a2040').lerp(new THREE.Color('#111d35'), t).getStyle()
            };
        }
        return { zenithColor: '#1e56a0', midColor: '#5a9ac4', horizonColor: '#c4dce8' };
    }, [hour]);

    // Create 3-zone gradient via vertex colors
    React.useEffect(() => {
        if (!meshRef.current) return;
        const geo = meshRef.current.geometry;
        const pos = geo.attributes.position;
        const colors = new Float32Array(pos.count * 3);
        const zenith = new THREE.Color(zenithColor);
        const mid = new THREE.Color(midColor);
        const horizon = new THREE.Color(horizonColor);
        
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            // Normalize y from sphere coords: -1 (bottom) to +1 (top)
            const normalized = Math.max(0, Math.min(1, (y + 1) / 2));
            
            let c: THREE.Color;
            if (normalized < 0.35) {
                // Horizon zone (bottom 35%) — horizon to mid
                const t = normalized / 0.35;
                const eased = Math.pow(t, 0.7);
                c = horizon.clone().lerp(mid, eased);
            } else if (normalized < 0.7) {
                // Mid-sky zone (35%-70%) — mid to zenith transition
                const t = (normalized - 0.35) / 0.35;
                const eased = Math.pow(t, 0.8);
                c = mid.clone().lerp(zenith, eased);
            } else {
                // Zenith zone (top 30%) — pure zenith with slight darkening at very top
                const t = (normalized - 0.7) / 0.3;
                c = zenith.clone().multiplyScalar(1.0 - t * 0.15);
            }
            
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }, [zenithColor, midColor, horizonColor]);

    return (
        <mesh ref={meshRef} scale={[-1, 1, 1]}>
            <sphereGeometry args={[200, 32, 32]} />
            <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} />
        </mesh>
    );
};

// Horizon atmospheric glow band
export const HorizonGlow = ({ hour, quality = 'medium' }: { hour: number, quality?: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    
    const { color, opacity } = useMemo(() => {
        const isNight = hour >= 20 || hour < 5;
        if (isNight) return { color: '#111d35', opacity: 0.06 };
        if (hour >= 17 && hour < 20) {
            const t = (hour - 17) / 3;
            return { 
                color: new THREE.Color('#c4a060').lerp(new THREE.Color('#8b4030'), t).getStyle(),
                opacity: 0.12 + t * 0.08
            };
        }
        if (hour >= 5 && hour < 8) {
            const t = (hour - 5) / 3;
            return {
                color: new THREE.Color('#8b5040').lerp(new THREE.Color('#c4a878'), t).getStyle(),
                opacity: 0.15 - t * 0.08
            };
        }
        return { color: '#b8c8d8', opacity: 0.04 };
    }, [hour]);

    useFrame((state) => {
        if (meshRef.current) {
            (meshRef.current.material as THREE.MeshBasicMaterial).opacity = opacity + Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
        }
    });

    if (quality === 'low') return null;

    return (
        <mesh ref={meshRef} position={[0, 0, -80]} rotation={[0, 0, 0]}>
            <planeGeometry args={[400, 30]} />
            <meshBasicMaterial 
                color={color} 
                transparent 
                opacity={opacity} 
                depthWrite={false}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// Wispy cirrus clouds at high altitude
