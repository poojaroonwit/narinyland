"use client";

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Detailed } from '@react-three/drei';
import * as THREE from 'three';

// Simplified Flower Content for LOD
export const FlowerContent = ({ type, scale, windFactor, quality, detail = 'high', seed }: any) => {
    const groupRef = useRef<THREE.Group>(null);
    const stemColor = "#15803d";
    
    useFrame((state) => {
        if (groupRef.current && detail !== 'low') {
            const t = state.clock.getElapsedTime();
            // Organic swaying in the wind - disable on low
            if (quality !== 'low') {
                groupRef.current.rotation.x = Math.sin(t * 1.5 * windFactor + seed) * (0.1 * windFactor);
                groupRef.current.rotation.z = Math.cos(t * 1.2 * windFactor + seed) * (0.05 * windFactor);
            }
        }
    });

    const isLow = detail === 'low' || quality === 'low';
    const isMid = detail === 'medium';
    
    return (
        <group scale={scale} ref={groupRef}>
            {/* Stem - Use simpler geometry for distant flowers */}
            <mesh position={[0, 0.2, 0]} castShadow={detail === 'high'}>
                <cylinderGeometry args={[0.015, 0.025, 0.4, isLow ? 3 : (isMid ? 5 : 8)]} />
                <meshStandardMaterial color={stemColor} />
            </mesh>

            {/* Bloom */}
            <group position={[0, 0.4, 0]}>
                {type === 'sunflower' && (
                    <group>
                        {[
                            { pos: [0, 0, 0], s: 1, rotY: 0 },
                            ...(isLow ? [] : [
                                { pos: [0.1, -0.05, 0.08], s: 0.7, rotY: 1 },
                                { pos: [-0.08, -0.02, -0.05], s: 0.85, rotY: 2.5 }
                            ])
                        ].map((sf, k) => (
                            <group key={k} position={sf.pos as [number, number, number]} scale={sf.s} rotation={[0, sf.rotY, 0]}>
                                 <group position={[0, -0.2, 0]}>
                                       {/* Tall Stem */}
                                     <mesh position={[0, 0.35, 0]}>
                                         <cylinderGeometry args={[0.02, 0.03, 0.7, isLow ? 3 : 6]} />
                                         <meshStandardMaterial color={stemColor} />
                                     </mesh>
                                     
                                     {/* Large Leaves */}
                                     {!isLow && (
                                       <>
                                         <mesh position={[0.08, 0.2, 0]} rotation={[0, 0, -0.5]}>
                                             <sphereGeometry args={[0.08, 6, 4]} scale={[1.5, 0.2, 1]} />
                                             <meshStandardMaterial color={stemColor} side={THREE.DoubleSide} />
                                         </mesh>
                                         <mesh position={[-0.08, 0.4, 0]} rotation={[0, 0, 0.5]}>
                                             <sphereGeometry args={[0.08, 6, 4]} scale={[1.5, 0.2, 1]} />
                                             <meshStandardMaterial color={stemColor} side={THREE.DoubleSide} />
                                         </mesh>
                                       </>
                                     )}

                                     {/* Flower Head */}
                                     <group position={[0, 0.65, 0.05]} rotation={[0.4, 0, 0]}>
                                        <mesh position={[0, 0, -0.02]} rotation={[Math.PI/2, 0, 0]}>
                                            <cylinderGeometry args={[0.03, 0.02, 0.05, isLow ? 4 : 8]} />
                                            <meshStandardMaterial color={stemColor} />
                                        </mesh>
                                        
                                        {/* Petals */}
                                        {Array.from({ length: isLow ? 6 : (isMid ? 10 : 12) }).map((_, i) => {
                                            const step = isLow ? 6 : (isMid ? 10 : 12);
                                            return (
                                                <mesh key={i} rotation={[0, 0, (i / step) * Math.PI * 2]} position={[0, 0, 0]}>
                                                    <mesh position={[0.18, 0, 0]}>
                                                        <sphereGeometry args={[0.1, 6, 4]} scale={[1.8, 0.4, 1]} />
                                                        <meshStandardMaterial color="#fbbf24" emissive="#d97706" emissiveIntensity={0.2} />
                                                    </mesh>
                                                </mesh>
                                            )
                                        })}
                                        {/* Center */}
                                        <mesh position={[0, 0, 0.03]}>
                                            <circleGeometry args={[0.14, isLow ? 6 : 16]} />
                                            <meshStandardMaterial color="#451a03" roughness={1} />
                                        </mesh>
                                        {/* Seeds Detail */}
                                        {detail === 'high' && (
                                            <mesh position={[0, 0, 0.035]}>
                                                <ringGeometry args={[0, 0.12, 16]} /> 
                                                <meshStandardMaterial color="#78350f" wireframe opacity={0.3} transparent />
                                            </mesh>
                                        )}
                                     </group>
                                 </group>
                            </group>
                        ))}
                    </group>
                )}
                {type === 'tulip' && (
                    <group>
                        {[
                            { pos: [0, 0, 0], s: 1, r: [0, 0, 0] },
                            ...(isLow ? [] : [
                                { pos: [0.06, -0.02, 0.06], s: 0.85, r: [0.1, 2, 0.1] },
                                { pos: [-0.06, -0.01, -0.05], s: 0.9, r: [-0.1, 4, -0.1] }
                            ])
                        ].map((tData, k) => (
                            <group key={k} position={tData.pos as [number, number, number]} scale={tData.s} rotation={tData.r as [number, number, number]}>
                                 <group position={[0, 0.1, 0]}>
                                     {/* Stem Base */}
                                     <mesh position={[0, -0.1, 0]}>
                                         <cylinderGeometry args={[0.04, 0.03, 0.25, isLow ? 3 : 8]} />
                                         <meshStandardMaterial color={stemColor} />
                                     </mesh>

                                     {/* Flower Head */}
                                     <group position={[0, 0.12, 0]}>
                                        <group scale={[1, 1, 1]}>
                                            {/* Main Cup */}
                                            <mesh position={[0, 0.08, 0]}>
                                                <cylinderGeometry args={[0.04, 0.07, 0.12, isLow ? 5: 8, 1, true]} />
                                                <meshStandardMaterial color="#be123c" side={THREE.DoubleSide} />
                                            </mesh>
                                            {/* Petals */}
                                            {[0, 1, 2].map((i) => (
                                                <mesh 
                                                    key={i} 
                                                    rotation={[0.1, i * (Math.PI * 2 / 3), 0]} 
                                                    position={[Math.sin(i * (Math.PI * 2 / 3)) * 0.03, 0.1, Math.cos(i * (Math.PI * 2 / 3)) * 0.03]}
                                                >
                                                    <sphereGeometry args={[0.045, isLow ? 3 : 8, isLow ? 4 : 12, 0, Math.PI * 2, 0, Math.PI/2]} />
                                                    <meshStandardMaterial color="#f43f5e" emissive="#be123c" emissiveIntensity={0.1} side={THREE.DoubleSide} />
                                                </mesh>
                                            ))}
                                        </group>
                                     </group>

                                     {/* Long Leaves */}
                                     {!isLow && (
                                        <group position={[0, -0.15, 0]}>
                                            <mesh rotation={[0.4, 0, 0]} position={[0, 0.12, 0.06]}>
                                                <cylinderGeometry args={[0.01, 0.03, 0.4, 4]} />
                                                <meshStandardMaterial color={stemColor} />
                                            </mesh>
                                            <mesh rotation={[0.5, Math.PI, 0]} position={[0, 0.1, -0.06]} scale={0.85}>
                                                <cylinderGeometry args={[0.01, 0.03, 0.4, 4]} />
                                                <meshStandardMaterial color={stemColor} />
                                            </mesh>
                                        </group>
                                     )}
                                </group>
                            </group>
                        ))}
                    </group>
                )}
                {type === 'rose' && (
                    <group>
                        {[
                            { pos: [0, 0, 0], s: 0.8, c: "#be123c" },
                            ...(isLow ? [] : [
                                { pos: [0.08, -0.05, 0.05], s: 0.6, c: "#9f1239" },
                                { pos: [-0.07, -0.08, -0.06], s: 0.7, c: "#e11d48" }
                            ])
                        ].map((rData, k) => (
                            <group key={k} position={rData.pos as [number, number, number]} scale={rData.s} rotation={[Math.random()*0.5, Math.random()*Math.PI, Math.random()*0.5]}>
                                <mesh castShadow={detail === 'high'} position={[0, 0.1, 0]}>
                                    {isLow ? (
                                        <sphereGeometry args={[0.12, 6, 6]} />
                                    ) : (
                                        <torusKnotGeometry args={[0.08, 0.03, 24, 8, 2, 3]} />
                                    )}
                                    <meshStandardMaterial color={rData.c} roughness={0.3} emissive={rData.c} emissiveIntensity={0.2} />
                                </mesh>
                                {/* Leaves */}
                                {!isLow && (
                                    <group position={[0, -0.05, 0]}>
                                        <mesh rotation={[0.5, 0, 0]} position={[0, 0, 0.06]}>
                                            <coneGeometry args={[0.04, 0.15, 3]} />
                                            <meshStandardMaterial color={stemColor} />
                                        </mesh>
                                        <mesh rotation={[0.5, Math.PI, 0]} position={[0, -0.02, -0.06]}>
                                            <coneGeometry args={[0.04, 0.15, 3]} />
                                            <meshStandardMaterial color={stemColor} />
                                        </mesh>
                                    </group>
                                )}
                            </group>
                        ))}
                    </group>
                )}
                {type === 'cherry' && (
                    <group>
                        {Array.from({ length: isLow ? 3 : 5 }).map((_, i) => (
                            <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0.5]} position={[0, 0, 0]}>
                                <sphereGeometry args={[0.1, isLow ? 3 : 8, isLow ? 3 : 8]} scale={[1.2, 0.4, 1]} />
                                <meshStandardMaterial color="#fbcfe8" transparent opacity={0.9} />
                            </mesh>
                        ))}
                        <mesh>
                            <sphereGeometry args={[0.04, isLow ? 3 : 8, isLow ? 3 : 8]} />
                            <meshStandardMaterial color="#f472b6" />
                        </mesh>
                    </group>
                )}
                {type === 'lavender' && (
                    <group>
                        {[
                            { x: 0, z: 0, h: 1 }, 
                            ...(isLow ? [] : [
                                { x: 0.05, z: 0.05, h: 0.8 },
                                { x: -0.05, z: 0.05, h: 0.9 },
                                { x: 0.05, z: -0.05, h: 0.85 },
                                { x: -0.05, z: -0.05, h: 0.75 }
                            ])
                        ].map((pos, k) => (
                            <group key={k} position={[pos.x, 0, pos.z]} scale={[1, pos.h, 1]} rotation={[Math.random()*0.2, 0, Math.random()*0.2]}>
                                {/* Stem */}
                                <mesh position={[0, 0, 0]}>
                                    <cylinderGeometry args={[0.005, 0.005, 0.4, 3]} />
                                    <meshStandardMaterial color="#4ade80" />
                                </mesh>
                                {/* Buds */}
                                {Array.from({ length: isLow ? 3 : 7 }).map((_, i) => (
                                    <mesh key={i} position={[0, 0.1 + i * 0.05, 0]}>
                                        <sphereGeometry args={[0.025, 4, 3]} />
                                        <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={0.3} />
                                    </mesh>
                                ))}
                            </group>
                        ))}
                    </group>
                )}
                {type === 'cactus' && (
                    <group>
                        <mesh position={[0, 0.1, 0]}>
                            <cylinderGeometry args={[0.12, 0.12, 0.3, isLow ? 4 : 8]} />
                            <meshStandardMaterial color="#166534" flatShading />
                        </mesh>
                        {/* Spikes - skip on low */}
                        {!isLow && Array.from({ length: 8 }).map((_, i) => (
                             <mesh key={i} position={[Math.cos(i) * 0.12, 0.1 + (i % 3) * 0.05, Math.sin(i) * 0.12]} rotation={[0, 0, Math.PI / 2]}>
                                <coneGeometry args={[0.005, 0.04, 3]} />
                                <meshStandardMaterial color="white" />
                             </mesh>
                        ))}
                    </group>
                )}
                {type === 'heart' && (
                    <mesh position={[0, 0, 0]}>
                        <sphereGeometry args={[0.15, isLow ? 6 : 12, isLow ? 6 : 12]} />
                        <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={0.5} />
                    </mesh>
                )}
                {!['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'cactus', 'heart'].includes(type) && (
                    <mesh>
                        <torusGeometry args={[0.1, 0.05, 16, 32]} />
                        <meshStandardMaterial color="hotpink" emissive="hotpink" emissiveIntensity={0.5} />
                    </mesh>
                )}
            </group>
        </group>
    );
};

// Flower Wrapper with LOD
export const Flower = ({ type, position, scale = 1, windFactor = 1, quality = 'medium' }: { type: string, position: [number, number, number], scale?: number, windFactor?: number, quality?: string }) => {
    const seed = useMemo(() => Math.random() * Math.PI * 2, []);
    
    return (
        <group position={position}>
            <Detailed distances={[0, 10, 20]}>
                <FlowerContent type={type} scale={scale} windFactor={windFactor} quality={quality} detail="high" seed={seed} />
                <FlowerContent type={type} scale={scale} windFactor={windFactor} quality={quality} detail="medium" seed={seed} />
                <FlowerContent type={type} scale={scale} windFactor={windFactor} quality={quality} detail="low" seed={seed} />
            </Detailed>
        </group>
    );
};
