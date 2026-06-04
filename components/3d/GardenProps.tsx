"use client";

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type GardenTheme = {
    ground: string;
    patch: string;
    bg?: string;
};

const seededRatio = (seed: number) => {
    const value = Math.sin(seed * 9301 + 49297) * 233280;
    return value - Math.floor(value);
};

// Procedural Terrain with vertex coloring
export const Terrain = ({ theme, quality = 'medium' }: { theme: GardenTheme, quality?: string }) => {
    const segments = quality === 'high' ? 64 : (quality === 'medium' ? 32 : 16);
    const size = 30;
    
    const geom = useMemo(() => {
        const g = new THREE.PlaneGeometry(size, size, segments, segments);
        const pos = g.attributes.position;
        const colors = [];
        const color1 = new THREE.Color(theme.ground);
        const color2 = color1.clone().multiplyScalar(0.8);
        const color3 = color1.clone().lerp(new THREE.Color('#ffffff'), 0.2);
        
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            
            // Simplex-like noise for height
            const h = (Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.4) + 
                      (Math.sin(x * 0.8 + y * 0.8) * 0.15);
            pos.setZ(i, h);
            
            // Vertex Coloring based on height and position
            const mixedColor = color1.clone();
            if (h > 0.2) mixedColor.lerp(color3, 0.5);
            if (h < -0.1) mixedColor.lerp(color2, 0.4);
            
            // Add some "patches" (organic variation)
            const patchValue = Math.sin(x * 0.8) * Math.cos(y * 0.8);
            if (patchValue > 0.4) mixedColor.lerp(new THREE.Color(theme.patch), 0.2);
            
            colors.push(mixedColor.r, mixedColor.g, mixedColor.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        g.computeVertexNormals();
        return g;
    }, [theme.ground, theme.patch, segments]);

    return (
        <mesh 
            geometry={geom} 
            rotation={[-Math.PI / 2, 0, 0]} 
            receiveShadow={quality !== 'low'}
        >
            <meshStandardMaterial 
                vertexColors 
                roughness={0.95} 
                metalness={0} 
                flatShading={quality === 'low'}
            />
        </mesh>
    );
};

export const Grass = ({ theme, position, windFactor, quality = 'medium' }: { theme: GardenTheme, position: { x: number, z: number }, windFactor: number, quality?: string }) => {
    const ref = useRef<THREE.Group>(null);
    const seed = useMemo(() => position.x * 17.17 + position.z * 31.31, [position.x, position.z]);
    
    useFrame((state) => {
        if (ref.current && quality !== 'low') {
            const t = state.clock.getElapsedTime();
            ref.current.rotation.x = Math.sin(t * 2 + seed) * (0.1 * windFactor);
            ref.current.rotation.z = Math.cos(t * 1.5 + seed) * (0.05 * windFactor);
        }
    });

    if (quality === 'low') return null;

    return (
        <group ref={ref} position={[position.x, 0, position.z]}>
            {Array.from({ length: quality === 'high' ? 3 : 1 }).map((_, i) => (
                <mesh key={i} position={[(i - 1) * 0.05, 0.1, 0]} rotation={[0, i * 0.5, 0]}>
                    <cylinderGeometry args={[0.01, 0.02, 0.3, 3]} />
                    <meshStandardMaterial color={theme.bg === '#fee2e2' ? '#a3e635' : '#3f6212'} />
                </mesh>
            ))}
        </group>
    );
};

export const MeadowLayer = ({ theme, windFactor, quality = 'medium' }: { theme: GardenTheme, windFactor: number, quality?: string }) => {
    const ref = useRef<THREE.Group>(null);
    const clumpCount = quality === 'high' ? 90 : quality === 'medium' ? 44 : 0;
    const flowerCount = quality === 'high' ? 32 : quality === 'medium' ? 14 : 0;

    const clumps = useMemo(() => {
        return Array.from({ length: clumpCount }).map((_, i) => {
            const radius = 4 + seededRatio(i + 300) * 11.5;
            const angle = seededRatio(i + 410) * Math.PI * 2;
            return {
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                scale: 0.6 + seededRatio(i + 510) * 0.9,
                rotation: seededRatio(i + 610) * Math.PI * 2,
                colorMix: seededRatio(i + 710),
            };
        });
    }, [clumpCount]);

    const flowers = useMemo(() => {
        return Array.from({ length: flowerCount }).map((_, i) => {
            const radius = 4.5 + seededRatio(i + 820) * 10;
            const angle = seededRatio(i + 920) * Math.PI * 2;
            return {
                x: Math.cos(angle) * radius,
                z: Math.sin(angle) * radius,
                color: ['#f9a8d4', '#fde68a', '#fbcfe8', '#fecaca'][i % 4],
                scale: 0.55 + seededRatio(i + 1020) * 0.4,
            };
        });
    }, [flowerCount]);

    useFrame((state) => {
        if (!ref.current || quality === 'low') return;
        const t = state.clock.getElapsedTime();
        ref.current.rotation.z = Math.sin(t * 0.28) * 0.01 * windFactor;
    });

    if (quality === 'low') return null;

    return (
        <group ref={ref}>
            {clumps.map((clump, i) => {
                const bladeColor = clump.colorMix > 0.65 ? theme.patch : '#5f8a3a';
                return (
                    <group key={`clump-${i}`} position={[clump.x, 0.03, clump.z]} rotation={[0, clump.rotation, 0]} scale={clump.scale}>
                        {[0, 1, 2].map((blade) => (
                            <mesh key={blade} position={[(blade - 1) * 0.05, 0.12, 0]} rotation={[0.18, blade * 0.55, (blade - 1) * 0.18]}>
                                <boxGeometry args={[0.035, 0.35 + blade * 0.08, 0.018]} />
                                <meshStandardMaterial color={bladeColor} roughness={1} />
                            </mesh>
                        ))}
                    </group>
                );
            })}

            {flowers.map((flower, i) => (
                <group key={`meadow-flower-${i}`} position={[flower.x, 0.05, flower.z]} scale={flower.scale}>
                    <mesh position={[0, 0.18, 0]}>
                        <cylinderGeometry args={[0.01, 0.015, 0.32, 4]} />
                        <meshStandardMaterial color="#4d7c2f" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <circleGeometry args={[0.09, 8]} />
                        <meshStandardMaterial color={flower.color} roughness={0.9} />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

export const GardenProp = ({ position, type, quality = 'medium' }: { position: [number, number, number], type: 'rock' | 'fence', quality?: string }) => {
    return (
        <group position={position}>
            {type === 'rock' && (
                <group>
                    {/* Main Rock Body */}
                    <mesh position={[0, 0.2, 0]} rotation={[0.5, 0.2, 0]} castShadow={quality !== 'low'}>
                        <dodecahedronGeometry args={[0.4, 0]} />
                        <meshStandardMaterial color="#64748b" flatShading />
                    </mesh>
                    {/* Small Attached Rock */}
                    <mesh position={[0.3, 0.1, 0.2]} scale={0.6} rotation={[0, 0.5, 0.8]} castShadow={quality === 'high'}>
                        <dodecahedronGeometry args={[0.3, 0]} />
                        <meshStandardMaterial color="#94a3b8" flatShading />
                    </mesh>
                    {/* Moss Patches */}
                    <mesh position={[0, 0.35, 0.1]} rotation={[-0.5, 0, 0]} scale={[0.4, 0.1, 0.3]}>
                        <sphereGeometry args={[1, quality === 'low' ? 4 : 8, quality === 'low' ? 4 : 8]} />
                        <meshStandardMaterial color="#166534" roughness={1} />
                    </mesh>
                    <mesh position={[0.2, 0.2, 0.3]} scale={[0.2, 0.05, 0.2]}>
                        <sphereGeometry args={[1, 5, 5]} />
                        <meshStandardMaterial color="#3f6212" roughness={1} />
                    </mesh>
                </group>
            )}
            {type === 'fence' && (
                <group>
                    {/* Horizontal Rails */}
                    <mesh position={[0, 0.25, 0]} castShadow={quality === 'high'}>
                        <boxGeometry args={[1.2, 0.04, 0.04]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                    <mesh position={[0, 0.45, 0]} castShadow={quality === 'high'}>
                        <boxGeometry args={[1.2, 0.04, 0.04]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                    {/* Vertical Pickets */}
                    {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
                        <mesh key={i} position={[x, 0.3, 0]} castShadow={quality === 'high'}>
                             <boxGeometry args={[0.1, 0.6, 0.03]} />
                             <meshStandardMaterial color="#d4a373" />
                             {/* Tapered Top */}
                             <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 4]}>
                                 <boxGeometry args={[0.07, 0.07, 0.03]} />
                                 <meshStandardMaterial color="#d4a373" />
                             </mesh>
                        </mesh>
                    ))}
                </group>
            )}
        </group>
    );
};

export const Pond = ({ quality = 'medium' }: { quality?: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current && quality !== 'low') {
            const t = state.clock.getElapsedTime();
            // Simple ripple effect by moving texture offset or scale
            meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
        }
    });

    return (
        <group position={[6, -0.05, -6]} rotation={[-Math.PI / 2, 0, 0]}>
            {/* Water surface */}
            <mesh ref={meshRef}>
                <circleGeometry args={[3, quality === 'low' ? 16 : 32]} />
                <meshStandardMaterial 
                    color="#3b82f6" 
                    transparent 
                    opacity={0.6} 
                    roughness={0.1} 
                    metalness={0.8}
                    emissive="#1d4ed8"
                    emissiveIntensity={0.2}
                />
            </mesh>
            {/* Pond edge/sand */}
            <mesh position={[0, 0, -0.01]}>
                <circleGeometry args={[3.2, quality === 'low' ? 16 : 32]} />
                <meshStandardMaterial color="#d4a373" />
            </mesh>
            {/* Reeds */}
            {quality !== 'low' && Array.from({ length: 12 }).map((_, i) => {
                const angle = (i / 12) * Math.PI * 2;
                return (
                    <mesh 
                        key={i} 
                        position={[Math.cos(angle) * 2.8, Math.sin(angle) * 2.8, 0.2]} 
                        rotation={[Math.PI / 2, 0, 0]}
                    >
                        <cylinderGeometry args={[0.02, 0.01, 0.8, 4]} />
                        <meshStandardMaterial color="#166534" />
                    </mesh>
                );
            })}
        </group>
    );
};

export const StonePath = ({ quality = 'medium' }: { quality?: string }) => {
    return (
        <group>
            {[
                { x: 0, z: 1.5 }, { x: 0.2, z: 2.2 }, { x: 0.5, z: 2.9 }, 
                { x: 1.0, z: 3.5 }, { x: 1.6, z: 4.1 }, { x: 2.4, z: 4.6 }
            ].map((p, i) => (
                <mesh 
                    key={i} 
                    position={[p.x, -0.08, p.z]} 
                    rotation={[-Math.PI / 2, 0, seededRatio(i + 1) * Math.PI * 2]}
                    receiveShadow={quality === 'high'}
                >
                    <circleGeometry args={[0.3 + seededRatio(i + 11) * 0.1, quality === 'low' ? 6 : 8]} />
                    <meshStandardMaterial color="#94a3b8" roughness={1} />
                </mesh>
            ))}
        </group>
    );
};
