"use client";

import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Float, Text } from '@react-three/drei';
import * as THREE from 'three';

// Ambient Falling Leaf
export const FallingLeaf = ({ theme, quality = 'medium' }: { theme: any, quality?: string }) => {
    const ref = useRef<THREE.Group>(null);
    const { position, rotation, speed, color, drift } = useMemo(() => {
        return {
            position: [
                (Math.random() - 0.5) * 6,
                4 + Math.random() * 6,
                (Math.random() - 0.5) * 6
            ] as [number, number, number],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
            speed: 0.015 + Math.random() * 0.025,
            drift: 0.01 + Math.random() * 0.02,
            color: theme.leaves[Math.floor(Math.random() * theme.leaves.length)]
        };
    }, [theme]);

    useFrame((state) => {
        if (!ref.current || quality === 'low') return;
        const t = state.clock.getElapsedTime();
        ref.current.position.y -= speed;
        // Swaying as it falls
        ref.current.position.x += Math.sin(t + position[0]) * drift;
        ref.current.position.z += Math.cos(t * 0.5 + position[2]) * drift;
        
        ref.current.rotation.x += 0.02;
        ref.current.rotation.y += 0.01;
        
        // Reset leaf when it hits ground
        if (ref.current.position.y < 0) {
            ref.current.position.y = 8 + Math.random() * 4;
            ref.current.position.x = (Math.random() - 0.5) * 6;
            ref.current.position.z = (Math.random() - 0.5) * 6;
        }
    });

    if (quality === 'low') return null;

    return (
        <group ref={ref} position={position} rotation={rotation}>
             <mesh scale={[0.15, 0.04, 0.12]}>
                <sphereGeometry args={[1, 4, 4]} />
                <meshStandardMaterial color={color} transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// Particle explosion when adding a leaf
export const LeafExplosion = ({ count = 20, color = "#4ade80" }) => {
  const group = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (group.current) {
        group.current.children.forEach((child: any) => {
            child.position.add(child.userData.velocity);
            child.userData.velocity.y -= delta * 0.5; // Gravity
            child.scale.multiplyScalar(0.95); // Shrink
            child.rotation.x += child.userData.spin.x;
            child.rotation.y += child.userData.spin.y;
            child.rotation.z += child.userData.spin.z;
        });
    }
  });

  const particles = useMemo(() => {
      return Array.from({ length: count }).map(() => ({
          position: [0, 2, 0] as [number, number, number],
          velocity: [
              (Math.random() - 0.5) * 0.2,
              Math.random() * 0.2 + 0.1,
              (Math.random() - 0.5) * 0.2
          ] as [number, number, number],
          spin: {
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
          },
          scale: Math.random() * 0.3 + 0.1,
          color: color
      }));
  }, [count, color]);

  return (
    <group ref={group}>
        {particles.map((p, i) => (
            <mesh key={i} position={p.position} userData={{ velocity: new THREE.Vector3(...p.velocity), spin: p.spin }}>
                <sphereGeometry args={[p.scale, 5, 5]} />
                <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.5} transparent opacity={0.8} />
            </mesh>
        ))}
    </group>
  );
};

export const Bird = () => {
    const ref = useRef<THREE.Group>(null);
    const speed = useMemo(() => 0.4 + Math.random() * 0.4, []);
    const radius = useMemo(() => 6 + Math.random() * 4, []);
    const yOffset = useMemo(() => 6 + Math.random() * 2, []);
    const startPhase = useMemo(() => Math.random() * Math.PI * 2, []);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.elapsedTime * speed + startPhase;
        ref.current.position.x = Math.cos(t) * radius;
        ref.current.position.z = Math.sin(t) * radius;
        ref.current.position.y = yOffset + Math.sin(t * 3) * 0.6;
        ref.current.rotation.y = -t + Math.PI / 2;
        ref.current.rotation.z = Math.sin(t * 2) * 0.2; // Bank into turns
        
        // Wing flap
        const wingL = ref.current.children[0] as THREE.Mesh;
        const wingR = ref.current.children[1] as THREE.Mesh;
        if (wingL && wingR) {
            wingL.rotation.z = Math.sin(clock.elapsedTime * 12) * 0.7;
            wingR.rotation.z = -Math.sin(clock.elapsedTime * 12) * 0.7;
        }
    });

    return (
        <group ref={ref}>
            <mesh position={[-0.15, 0, 0]}>
                <boxGeometry args={[0.3, 0.01, 0.15]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0.15, 0, 0]}>
                <boxGeometry args={[0.3, 0.01, 0.15]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            <group>
                <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                    <capsuleGeometry args={[0.06, 0.15, 4, 8]} />
                    <meshStandardMaterial color="#475569" />
                </mesh>
                <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.02, 0.08, 4]} />
                    <meshStandardMaterial color="#f59e0b" />
                </mesh>
            </group>
        </group>
    );
};

export const Butterfly = ({ flowers }: { flowers: any[] }) => {
    const ref = useRef<THREE.Group>(null);
    const [activity, setActivity] = useState<'flutter' | 'hover' | 'zip' | 'land'>('flutter');
    const timer = useRef(0);
    const targetPos = useRef(new THREE.Vector3());
    const color = useMemo(() => ['#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#2dd4bf'][Math.floor(Math.random() * 5)], []);
    const basePos = useMemo(() => [(Math.random() - 0.5) * 10, 2 + Math.random() * 2, (Math.random() - 0.5) * 10], []);

    useFrame((state, delta) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime;
        timer.current -= delta;

        if (timer.current <= 0) {
            const choices: typeof activity[] = ['flutter', 'hover', 'zip', 'land'];
            const newActivity = choices[Math.floor(Math.random() * choices.length)];
            setActivity(newActivity);
            timer.current = 3 + Math.random() * 4;
            
            if (newActivity === 'land' && flowers.length > 0) {
                const flower = flowers[Math.floor(Math.random() * flowers.length)];
                targetPos.current.set(flower.x, 0.45, flower.z);
            } else {
                targetPos.current.set(
                    (Math.random() - 0.5) * 8,
                    1 + Math.random() * 2,
                    (Math.random() - 0.5) * 8
                );
            }
        }

        const moveSpeed = activity === 'zip' ? 0.08 : (activity === 'land' ? 0.04 : (activity === 'hover' ? 0.01 : 0.03));
        ref.current.position.lerp(targetPos.current, moveSpeed);
        
        if (activity !== 'land' || ref.current.position.distanceTo(targetPos.current) > 0.1) {
            ref.current.position.y += Math.sin(t * 10) * 0.015;
        }

        const dir = targetPos.current.clone().sub(ref.current.position).normalize();
        if (dir.lengthSq() > 0.001) {
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
            ref.current.quaternion.slerp(targetQuat, 0.05);
        }
        
        ref.current.rotation.z = Math.sin(t * 5) * 0.2;

        const wingFL = ref.current.children[0] as THREE.Group;
        const wingFR = ref.current.children[1] as THREE.Group;
        const wingBL = ref.current.children[2] as THREE.Group;
        const wingBR = ref.current.children[3] as THREE.Group;

        if (wingFL && wingFR && wingBL && wingBR) {
            const isLanded = activity === 'land' && ref.current.position.distanceTo(targetPos.current) < 0.2;
            const flapSpeed = isLanded ? 1 : (activity === 'zip' ? 30 : (activity === 'hover' ? 12 : 20));
            const flapAngle = isLanded ? 0.2 : (activity === 'hover' ? 0.6 : 1.2);
            
            const wingAngle = Math.sin(t * flapSpeed) * flapAngle;
            wingFL.rotation.y = wingAngle;
            wingFR.rotation.y = -wingAngle;
            wingBL.rotation.y = wingAngle * 0.8;
            wingBR.rotation.y = -wingAngle * 0.8;
        }
    });

    return (
        <group ref={ref} position={basePos as [number, number, number]}>
            <group position={[-0.02, 0, 0.05]}>
                <mesh rotation={[0, 0, 0.2]}>
                    <planeGeometry args={[0.15, 0.2]} />
                    <meshStandardMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} />
                </mesh>
            </group>
            <group position={[0.02, 0, 0.05]}>
                <mesh rotation={[0, 0, -0.2]}>
                    <planeGeometry args={[0.15, 0.2]} />
                    <meshStandardMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} />
                </mesh>
            </group>
            <group position={[-0.02, 0, -0.05]}>
                <mesh rotation={[0, 0, 0.5]}>
                    <planeGeometry args={[0.12, 0.12]} />
                    <meshStandardMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
            </group>
            <group position={[0.02, 0, -0.05]}>
                <mesh rotation={[0, 0, -0.5]}>
                    <planeGeometry args={[0.12, 0.12]} />
                    <meshStandardMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
            </group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.015, 0.15, 4, 8]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            <mesh position={[0.02, 0.02, 0.08]} rotation={[-0.3, 0.2, 0]}>
                <cylinderGeometry args={[0.002, 0.002, 0.1]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-0.02, 0.02, 0.08]} rotation={[-0.3, -0.2, 0]}>
                <cylinderGeometry args={[0.002, 0.002, 0.1]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {activity === 'zip' && <Sparkles count={5} scale={0.5} size={1} speed={2} color={color} />}
        </group>
    );
};

export const FloatingText = ({ text, position, color = "#22c55e", onComplete }: { text: string, position: [number, number, number], color?: string, onComplete?: () => void }) => {
    const textRef = useRef<THREE.Group>(null);
    const [opacity, setOpacity] = React.useState(1);
    
    useFrame((state, delta) => {
        if (textRef.current) {
            textRef.current.position.y += delta * 1.5;
            setOpacity(prev => Math.max(0, prev - delta * 0.8));
            if (opacity <= 0 && onComplete) {
                onComplete();
            }
        }
    });

    if (opacity <= 0) return null;

    return (
        <group ref={textRef} position={position}>
            <Float speed={5} rotationIntensity={0.2} floatIntensity={0.2}>
               <Text
                 color={color}
                 fontSize={0.8}
                 maxWidth={200}
                 lineHeight={1}
                 letterSpacing={0.02}
                 textAlign="center"
                 font="https://fonts.gstatic.com/s/raleway/v14/1Ptrg8zYS_SKggPNwK4vaqI.woff"
                 anchorX="center"
                 anchorY="middle"
                 outlineWidth={0.05}
                 outlineColor="#ffffff"
                 fillOpacity={opacity}
                 outlineOpacity={opacity}
               >
                 {text}
               </Text>
            </Float>
        </group>
    );
};

export const Fireflies = ({ count = 20, quality = 'medium' }: { count?: number, quality?: string }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    if (quality === 'low') return null;
    const effectiveCount = quality === 'medium' ? Math.floor(count / 2) : count;

    const particles = useMemo(() => {
        return Array.from({ length: effectiveCount }, () => ({
            speed: 0.2 + Math.random() * 0.3,
            radius: 4 + Math.random() * 6,
            yBase: 1 + Math.random() * 3,
            seed: Math.random() * Math.PI * 2,
            floatSpeed: 0.5 + Math.random() * 0.5
        }));
    }, [effectiveCount]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        
        particles.forEach((p, i) => {
            const { speed, radius, yBase, seed, floatSpeed } = p;
            const x = Math.sin(time * speed + seed) * radius;
            const z = Math.cos(time * speed + seed) * radius;
            const y = yBase + Math.sin(time * floatSpeed + seed) * 0.8;
            dummy.position.set(x, y, z);
            const flicker = 0.5 + Math.abs(Math.sin(time * 3 + seed)) * 0.5;
            dummy.scale.set(flicker, flicker, flicker);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, effectiveCount]}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshStandardMaterial 
                color="#fef08a" 
                emissive="#fef08a" 
                emissiveIntensity={2} 
                transparent 
                opacity={0.8} 
            />
        </instancedMesh>
    );
};

export const FallingPetals = ({ count = 50, theme, quality = 'medium' }: { count?: number, theme: any, quality?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const effectiveCount = quality === 'low' ? 0 : quality === 'medium' ? Math.floor(count / 2) : count;

  const particles = useMemo(() => {
    if (effectiveCount === 0) return [];
    return Array.from({ length: effectiveCount }, () => ({
      position: [
        (Math.random() - 0.5) * 20,
        Math.random() * 10 + 5,
        (Math.random() - 0.5) * 20
      ] as [number, number, number],
      rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
      speed: Math.random() * 0.02 + 0.01,
      wobble: Math.random() * 0.1,
      wobblePhase: Math.random() * Math.PI * 2
    }));
  }, [effectiveCount]);

  useFrame((state) => {
    if (!meshRef.current || effectiveCount === 0) return;
    const time = state.clock.getElapsedTime();

    particles.forEach((p, i) => {
      p.position[1] -= p.speed;
      p.position[0] += Math.sin(time + p.wobblePhase) * 0.005;
      p.position[2] += Math.cos(time + p.wobblePhase) * 0.005;
      p.rotation[0] += 0.01;
      p.rotation[1] += 0.02;

      if (p.position[1] < -0.1) {
        p.position[1] = 10;
        p.position[0] = (Math.random() - 0.5) * 20;
        p.position[2] = (Math.random() - 0.5) * 20;
      }

      dummy.position.set(p.position[0], p.position[1], p.position[2]);
      dummy.rotation.set(p.rotation[0], p.rotation[1], 0);
      dummy.scale.set(0.6, 0.6, 0.6);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (effectiveCount === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, effectiveCount]}>
      <planeGeometry args={[0.1, 0.1]} />
      <meshStandardMaterial color={theme.leaves[0]} side={THREE.DoubleSide} transparent opacity={0.8} />
    </instancedMesh>
  );
};
// Procedural Drifting Clouds — enhanced with richer shapes and color gradients
export const Clouds = ({ hour, theme, quality = 'medium' }: { hour: number, theme: any, quality?: string }) => {
    const group = useRef<THREE.Group>(null);
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
        return Array.from({ length: count }).map((_, i) => ({
            position: [
                (Math.random() - 0.5) * 50,
                13 + Math.random() * 8,
                -10 + (Math.random() - 0.5) * 40
            ] as [number, number, number],
            scale: 1.5 + Math.random() * 3.5,
            speed: 0.003 + Math.random() * 0.006,
            seed: Math.random() * 100,
            puffCount: 3 + Math.floor(Math.random() * 4)
        }));
    }, [count]);

    // Generate puff offsets per cloud
    const cloudPuffs = useMemo(() => {
        return clouds.map(c => {
            const puffs = [];
            // Central puff
            puffs.push({ pos: [0, 0, 0] as [number, number, number], s: 1.0 });
            for (let j = 1; j < c.puffCount; j++) {
                const angle = (j / c.puffCount) * Math.PI * 2 + Math.random() * 0.5;
                const dist = 0.5 + Math.random() * 0.6;
                puffs.push({
                    pos: [Math.cos(angle) * dist, (Math.random() - 0.5) * 0.3, Math.sin(angle) * dist] as [number, number, number],
                    s: 0.5 + Math.random() * 0.5
                });
            }
            return puffs;
        });
    }, [clouds]);

    useFrame((state) => {
        if (!group.current) return;
        const t = state.clock.elapsedTime;
        group.current.children.forEach((cloud: any, i) => {
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
    
    useFrame((state, delta) => {
        if (quality === 'low') return;
        
        if (!active && Math.random() < 0.002) {
            setActive(true);
            if (ref.current) {
                ref.current.position.set(
                    (Math.random() - 0.5) * 50,
                    22 + Math.random() * 12,
                    -30 - Math.random() * 20
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
    const count = quality === 'high' ? 12 : (quality === 'medium' ? 6 : 0);
    
    // Only visible during golden hour/day
    const opacity = useMemo(() => {
        if (hour < 6 || hour > 19) return 0;
        if (hour > 16.5 || hour < 7.5) return 0.15; // Sunset/Sunrise
        return 0.05; // Day
    }, [hour]);

    const rays = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => ({
            rotation: [
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                Math.random() * Math.PI * 2
            ] as [number, number, number],
            scale: [0.5 + Math.random() * 1.5, 15 + Math.random() * 15, 1] as [number, number, number],
            speed: 0.1 + Math.random() * 0.2
        }));
    }, [count]);

    useFrame((state) => {
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
        groupRef.current.children.forEach((band: any, i) => {
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
export const SkyDome = ({ skyColor, hour, quality = 'medium' }: { skyColor: string, hour: number, quality?: string }) => {
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

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.children.forEach((wisp: any, i) => {
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

    useFrame((state) => {
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
