"use client";

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';

export const CirrusClouds = ({ hour, quality = 'medium' }: { hour: number, quality?: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const count = quality === 'high' ? 10 : (quality === 'medium' ? 5 : 0);

    const isNight = hour >= 20 || hour < 5;
    const color = useMemo(() => {
        if (isNight) return '#151e30';
        if (hour >= 17 || hour < 8) return '#c4a890';
        return '#d0dce6';
    }, [hour, isNight]);

    const wisps = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const sin1 = Math.sin(i * 127.1 + 311.7) * 43758.5453;
            const r1 = sin1 - Math.floor(sin1);
            const sin2 = Math.sin(i * 269.5 + 183.3) * 43758.5453;
            const r2 = sin2 - Math.floor(sin2);
            return {
                position: [
                    (r1 - 0.5) * 80,
                    25 + r2 * 15,
                    -20 + (Math.sin(i * 3.7) * 30)
                ] as [number, number, number],
                scaleX: 8 + r1 * 15,
                scaleY: 0.3 + r2 * 0.5,
                speed: 0.005 + r1 * 0.008,
                opacity: isNight ? 0.04 : 0.12 + r2 * 0.08
            };
        });
    }, [count, isNight]);

    useFrame(() => {
        if (!groupRef.current) return;
        groupRef.current.children.forEach((wisp, i) => {
            if (!wisps[i]) return;
            wisp.position.x += wisps[i].speed;
            if (wisp.position.x > 60) wisp.position.x = -60;
        });
    });

    if (count === 0) return null;

    return (
        <group ref={groupRef}>
            {wisps.map((w, i) => (
                <mesh key={i} position={w.position} scale={[w.scaleX, w.scaleY, 3]}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial 
                        color={color} 
                        transparent 
                        opacity={w.opacity} 
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
};

// Milky Way band for night sky
export const MilkyWay = ({ hour, quality = 'medium' }: { hour: number, quality?: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const isNight = hour >= 20 || hour < 5;
    const starCount = quality === 'high' ? 8 : 4;

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.z = state.clock.elapsedTime * 0.003;
        }
    });

    const clusters = useMemo(() => {
        return Array.from({ length: starCount }).map((_, i) => {
            const angle = (i / starCount) * Math.PI;
            const spread = 5 + (i % 3) * 3;
            return {
                position: [
                    Math.cos(angle) * 30 + (Math.sin(i * 7.3) * 10),
                    30 + Math.sin(angle) * 20,
                    -50 + Math.cos(i * 3.1) * 15
                ] as [number, number, number],
                scale: spread,
                opacity: 0.04 + (i % 2) * 0.02
            };
        });
    }, [starCount]);

    if (quality === 'low' || !isNight) return null;

    return (
        <group ref={groupRef}>
            {/* Main galactic band */}
            <mesh position={[0, 35, -60]} rotation={[0.4, 0.3, 0.8]}>
                <planeGeometry args={[120, 12]} />
                <meshBasicMaterial 
                    color="#c7d2fe" 
                    transparent 
                    opacity={0.035} 
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Core bright strip */}
            <mesh position={[0, 35, -59]} rotation={[0.4, 0.3, 0.8]}>
                <planeGeometry args={[100, 4]} />
                <meshBasicMaterial 
                    color="#e0e7ff" 
                    transparent 
                    opacity={0.05} 
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Star clusters along the band */}
            {clusters.map((c, i) => (
                <group key={i} position={c.position}>
                    <Sparkles 
                        count={quality === 'high' ? 40 : 20} 
                        scale={c.scale} 
                        size={1.5} 
                        speed={0.2} 
                        opacity={c.opacity} 
                        color="#e0e7ff" 
                    />
                </group>
            ))}
        </group>
    );
};

// Cosmic Nebula for special themes/night — enhanced with layered depth
export const Nebula = ({ treeStyle, hour, quality = 'medium' }: { treeStyle: string, hour: number, quality?: string }) => {
    const ref = useRef<THREE.Mesh>(null);
    const ref2 = useRef<THREE.Mesh>(null);
    const isSpecial = ['neon', 'midnight'].includes(treeStyle);
    const isNight = hour >= 19 || hour < 6;

    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.z += 0.0005;
            ref.current.rotation.x += 0.0002;
        }
        if (ref2.current) {
            ref2.current.rotation.z -= 0.0003;
            ref2.current.rotation.y += 0.0002;
        }
    });

    if (quality === 'low' || (!isSpecial && !isNight)) return null;

    return (
        <>
            <mesh ref={ref} position={[0, 0, -50]}>
                <sphereGeometry args={[80, 32, 32]} />
                <meshBasicMaterial 
                    color={treeStyle === 'neon' ? "#4c1d95" : "#1e1b4b"} 
                    transparent 
                    opacity={0.1} 
                    side={THREE.BackSide}
                />
                <Sparkles count={quality === 'high' ? 250 : 120} scale={100} size={6} speed={0.5} opacity={0.3} color="#f472b6" />
            </mesh>
            {/* Secondary nebula layer for depth */}
            <mesh ref={ref2} position={[20, 10, -60]}>
                <sphereGeometry args={[50, 24, 24]} />
                <meshBasicMaterial 
                    color={treeStyle === 'neon' ? "#7c3aed" : "#312e81"} 
                    transparent 
                    opacity={0.06} 
                    side={THREE.BackSide}
                />
                <Sparkles count={quality === 'high' ? 100 : 50} scale={60} size={4} speed={0.3} opacity={0.2} color="#c084fc" />
            </mesh>
        </>
    );
};

// Sunset/Sunrise color bands across the sky
export const SkyColorBands = ({ hour, quality = 'medium' }: { hour: number, quality?: string }) => {
    const isGolden = (hour >= 16.5 && hour < 19.5) || (hour >= 5 && hour < 8);
    
    const bands = useMemo(() => {
        if (!isGolden) return [];
        const isSunset = hour >= 16.5 && hour < 19.5;
        const t = isSunset ? (hour - 16.5) / 3 : (8 - hour) / 3;
        
        return [
            { y: 5, color: new THREE.Color('#c49060').lerp(new THREE.Color('#8b4030'), t).getStyle(), opacity: 0.05 + t * 0.04, width: 300, height: 15 },
            { y: 12, color: new THREE.Color('#a07850').lerp(new THREE.Color('#5a2838'), t).getStyle(), opacity: 0.04 + t * 0.03, width: 280, height: 10 },
            { y: 20, color: new THREE.Color('#8b9ab0').lerp(new THREE.Color('#2a1838'), t).getStyle(), opacity: 0.03 + t * 0.02, width: 250, height: 8 },
        ];
    }, [hour, isGolden]);

    if (quality === 'low' || !isGolden) return null;

    return (
        <group>
            {bands.map((band, i) => (
                <mesh key={i} position={[0, band.y, -90]} rotation={[0, 0, 0]}>
                    <planeGeometry args={[band.width, band.height]} />
                    <meshBasicMaterial 
                        color={band.color} 
                        transparent 
                        opacity={band.opacity} 
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
};
