"use client";

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { EnvironmentTheme, hashString, nextSeededRatio, seededRatio } from './shared';

export const Clouds = ({ hour, theme: _theme, quality = 'medium' }: { hour: number, theme: EnvironmentTheme, quality?: string }) => {
    const group = useRef<THREE.Group>(null);
    const instanceSeed = hashString(React.useId());
    void _theme;
    const count = quality === 'high' ? 12 : (quality === 'medium' ? 6 : 0);
    
    const cloudColor = useMemo(() => {
        if (hour >= 20 || hour < 5) return "#1a2030";
        if (hour >= 19 && hour < 20) return new THREE.Color("#8b6050").lerp(new THREE.Color("#1a2030"), (hour - 19)).getStyle();
        if (hour >= 17.5 && hour < 19) return new THREE.Color("#e8dcd0").lerp(new THREE.Color("#8b6050"), (hour - 17.5) / 1.5).getStyle();
        if (hour >= 6.5 && hour < 8) return new THREE.Color("#d4b8a0").lerp(new THREE.Color("#e8e4e0"), (hour - 6.5) / 1.5).getStyle();
        if (hour >= 5.5 && hour < 6.5) return new THREE.Color("#1a2030").lerp(new THREE.Color("#d4b8a0"), (hour - 5.5)).getStyle();
        return "#e8e4e0";
    }, [hour]);

    const cloudEdgeColor = useMemo(() => {
        if (hour >= 17 && hour < 19.5) return "#c49070";
        if (hour >= 5.5 && hour < 8) return "#c4a888";
        return cloudColor;
    }, [hour, cloudColor]);

    const clouds = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const seed = instanceSeed + i * 19;
            return {
            position: [
                (seededRatio(seed) - 0.5) * 50,
                13 + seededRatio(seed + 1) * 8,
                -10 + (seededRatio(seed + 2) - 0.5) * 40
            ] as [number, number, number],
            scale: 1.5 + seededRatio(seed + 3) * 3.5,
            speed: 0.003 + seededRatio(seed + 4) * 0.006,
            seed: seededRatio(seed + 5) * 100,
            puffCount: 3 + Math.floor(seededRatio(seed + 6) * 4)
            };
        });
    }, [count, instanceSeed]);

    // Generate puff offsets per cloud
    const cloudPuffs = useMemo(() => {
        return clouds.map(c => {
            const puffs = [];
            // Central puff
            puffs.push({ pos: [0, 0, 0] as [number, number, number], s: 1.0 });
            for (let j = 1; j < c.puffCount; j++) {
                const puffSeed = c.seed + j * 23;
                const angle = (j / c.puffCount) * Math.PI * 2 + seededRatio(puffSeed) * 0.5;
                const dist = 0.5 + seededRatio(puffSeed + 1) * 0.6;
                puffs.push({
                    pos: [Math.cos(angle) * dist, (seededRatio(puffSeed + 2) - 0.5) * 0.3, Math.sin(angle) * dist] as [number, number, number],
                    s: 0.5 + seededRatio(puffSeed + 3) * 0.5
                });
            }
            return puffs;
        });
    }, [clouds]);

    useFrame((state) => {
        if (!group.current) return;
        const t = state.clock.elapsedTime;
        group.current.children.forEach((cloud, i) => {
            if (!clouds[i]) return;
            cloud.position.x += clouds[i].speed;
            cloud.position.y += Math.sin(t * 0.3 + clouds[i].seed) * 0.003;
            if (cloud.position.x > 35) cloud.position.x = -35;
        });
    });

    if (count === 0) return null;

    const isGolden = (hour >= 17 && hour < 19.5) || (hour >= 5.5 && hour < 8);
    const baseOpacity = hour >= 19.5 || hour < 5.5 ? 0.25 : 0.45;

    return (
        <group ref={group}>
            {clouds.map((c, i) => (
                <group key={i} position={c.position} scale={c.scale}>
                    {cloudPuffs[i]?.map((puff, j) => (
                        <mesh key={j} position={puff.pos} scale={puff.s}>
                            <sphereGeometry args={[1, quality === 'high' ? 16 : 10, quality === 'high' ? 16 : 10]} />
                            <meshStandardMaterial 
                                color={j === 0 ? cloudColor : cloudEdgeColor} 
                                transparent 
                                opacity={j === 0 ? baseOpacity : baseOpacity * 0.7} 
                                flatShading 
                            />
                        </mesh>
                    ))}
                    {/* Underside shadow tint */}
                    <mesh position={[0, -0.3, 0]} scale={[1.2, 0.3, 1.2]}>
                        <sphereGeometry args={[1, 8, 8]} />
                        <meshStandardMaterial 
                            color={isGolden ? "#8b6848" : "#6b7b8b"} 
                            transparent 
                            opacity={0.15} 
                            flatShading 
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
};

// Shooting Star for night time — enhanced with longer trail and glow
export const ShootingStar = ({ quality = 'medium' }: { quality?: string }) => {
    const ref = useRef<THREE.Group>(null);
    const [active, setActive] = React.useState(false);
    const instanceSeed = hashString(React.useId());
    const spawnSeed = useRef(instanceSeed + 557);
    
    useFrame((state, delta) => {
        if (quality === 'low') return;
        
        if (!active && nextSeededRatio(spawnSeed) < 0.002) {
            setActive(true);
            if (ref.current) {
                ref.current.position.set(
                    (nextSeededRatio(spawnSeed) - 0.5) * 50,
                    22 + nextSeededRatio(spawnSeed) * 12,
                    -30 - nextSeededRatio(spawnSeed) * 20
                );
            }
        }

        if (active && ref.current) {
            ref.current.position.x += delta * 45;
            ref.current.position.y -= delta * 22;
            if (ref.current.position.y < 0) setActive(false);
        }
    });

    if (!active || quality === 'low') return null;

    return (
        <group ref={ref}>
            <Sparkles count={quality === 'high' ? 25 : 15} scale={1.5} size={5} speed={5} color="#fef08a" />
            {/* Main bright head */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color="#fffde7" />
            </mesh>
            {/* Trail */}
            <mesh rotation={[0, 0, Math.PI / 4]} position={[-0.8, 0.8, 0]}>
                <cylinderGeometry args={[0.005, 0.06, 5]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
            {/* Outer glow trail */}
            <mesh rotation={[0, 0, Math.PI / 4]} position={[-0.6, 0.6, 0]}>
                <cylinderGeometry args={[0.01, 0.12, 4]} />
                <meshBasicMaterial color="#fef9c3" transparent opacity={0.2} />
            </mesh>
        </group>
    );
};
// God Rays / Light Shafts
export const GodRays = ({ sunPosition, hour, quality = 'medium' }: { sunPosition: [number, number, number], hour: number, quality?: string }) => {
    const group = useRef<THREE.Group>(null);
    const instanceSeed = hashString(React.useId());
    const count = quality === 'high' ? 12 : (quality === 'medium' ? 6 : 0);
    
    // Only visible during golden hour/day
    const opacity = useMemo(() => {
        if (hour < 6 || hour > 19) return 0;
        if (hour > 16.5 || hour < 7.5) return 0.15; // Sunset/Sunrise
        return 0.05; // Day
    }, [hour]);

    const rays = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const seed = instanceSeed + i * 29;
            return {
            rotation: [
                (seededRatio(seed) - 0.5) * 0.4,
                (seededRatio(seed + 1) - 0.5) * 0.4,
                seededRatio(seed + 2) * Math.PI * 2
            ] as [number, number, number],
            scale: [0.5 + seededRatio(seed + 3) * 1.5, 15 + seededRatio(seed + 4) * 15, 1] as [number, number, number],
            speed: 0.1 + seededRatio(seed + 5) * 0.2
            };
        });
    }, [count, instanceSeed]);

    useFrame(() => {
        if (!group.current || opacity <= 0) return;
        group.current.rotation.z += 0.001;
    });

    if (count === 0 || opacity <= 0) return null;

    return (
        <group ref={group} position={sunPosition}>
            {rays.map((ray, i) => (
                <mesh key={i} rotation={ray.rotation} scale={ray.scale}>
                    <cylinderGeometry args={[0, 1, 1, 8, 1, true]} />
                    <meshBasicMaterial 
                        color={hour > 16.5 || hour < 7.5 ? "#ffba42" : "#ffffff"} 
                        transparent 
                        opacity={opacity} 
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
};

// Aurora Borealis for night sky — enhanced with wave animation and richer bands
export const Aurora = ({ hour, quality = 'medium' }: { hour: number, quality?: string }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRefs = useRef<THREE.Mesh[]>([]);
    const isNight = hour >= 19.5 || hour < 5.5;
    const bandCount = quality === 'high' ? 7 : (quality === 'medium' ? 4 : 0);

    const bands = useMemo(() => {
        const colors = ['#4ade80', '#22d3ee', '#a78bfa', '#34d399', '#818cf8', '#2dd4bf', '#c084fc'];
        return Array.from({ length: bandCount }).map((_, i) => ({
            yOffset: 22 + i * 4,
            zOffset: -35 - i * 6,
            color: colors[i % colors.length],
            speed: 0.12 + i * 0.04,
            amplitude: 4 + i * 1.0,
            width: 40 + i * 8,
            seed: i * 42.7,
            opacity: 0.08 - i * 0.008
        }));
    }, [bandCount]);

    useFrame((state) => {
        if (!groupRef.current || !isNight) return;
        const t = state.clock.elapsedTime;
        
        // Animate each band with wave motion
        groupRef.current.children.forEach((band, i) => {
            if (!bands[i]) return;
            band.position.y = bands[i].yOffset + Math.sin(t * bands[i].speed + bands[i].seed) * 2.0;
            band.rotation.z = Math.sin(t * 0.08 + bands[i].seed) * 0.06;
            band.rotation.x = 0.3 + Math.sin(t * 0.05 + bands[i].seed * 2) * 0.03;
        });

        // Vertex wave displacement on each aurora plane
        meshRefs.current.forEach((mesh, i) => {
            if (!mesh || !mesh.geometry) return;
            const pos = mesh.geometry.attributes.position;
            if (!pos) return;
            const arr = pos.array as Float32Array;
            for (let v = 0; v < pos.count; v++) {
                const x = arr[v * 3];
                arr[v * 3 + 1] = Math.sin(x * 0.3 + t * (0.4 + i * 0.1) + bands[i]?.seed) * 1.5;
            }
            pos.needsUpdate = true;
        });
    });

    if (quality === 'low' || !isNight) return null;

    return (
        <group ref={groupRef}>
            {bands.map((band, i) => (
                <mesh 
                    key={i} 
                    ref={(el) => { if (el) meshRefs.current[i] = el; }}
                    position={[0, band.yOffset, band.zOffset]} 
                    rotation={[0.3, 0, 0]}
                >
                    <planeGeometry args={[band.width, band.amplitude, 32, 4]} />
                    <meshBasicMaterial 
                        color={band.color} 
                        transparent 
                        opacity={band.opacity} 
                        side={THREE.DoubleSide}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
};

// Sky gradient dome — realistic 3-zone atmospheric gradient (zenith / mid-sky / horizon)
