"use client";

import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import { Sparkles, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { EnvironmentTheme, FlowerPosition, advanceSeed, hashString, nextSeededRatio, seededRatio } from './shared';
import { useGameLoop } from '../../game-engine-3d';

export const FallingLeaf = ({ theme, quality = 'medium' }: { theme: EnvironmentTheme, quality?: string }) => {
    const ref = useRef<THREE.Group>(null);
    const instanceSeed = hashString(React.useId());
    const resetSeed = useRef(instanceSeed + 97);
    const { position, rotation, speed, color, drift } = useMemo(() => {
        return {
            position: [
                (seededRatio(instanceSeed) - 0.5) * 6,
                4 + seededRatio(instanceSeed + 1) * 6,
                (seededRatio(instanceSeed + 2) - 0.5) * 6
            ] as [number, number, number],
            rotation: [seededRatio(instanceSeed + 3) * Math.PI, seededRatio(instanceSeed + 4) * Math.PI, seededRatio(instanceSeed + 5) * Math.PI] as [number, number, number],
            speed: 0.015 + seededRatio(instanceSeed + 6) * 0.025,
            drift: 0.01 + seededRatio(instanceSeed + 7) * 0.02,
            color: theme.leaves[Math.floor(seededRatio(instanceSeed + 8) * theme.leaves.length)] || theme.leaves[0]
        };
    }, [instanceSeed, theme]);

    useGameLoop((state) => {
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
            ref.current.position.y = 8 + nextSeededRatio(resetSeed) * 4;
            ref.current.position.x = (nextSeededRatio(resetSeed) - 0.5) * 6;
            ref.current.position.z = (nextSeededRatio(resetSeed) - 0.5) * 6;
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
  
  useGameLoop((state, delta) => {
    if (group.current) {
        group.current.children.forEach((child) => {
            const velocity = child.userData.velocity as THREE.Vector3 | undefined;
            const spin = child.userData.spin as { x: number; y: number; z: number } | undefined;
            if (!velocity || !spin) return;
            child.position.add(velocity);
            velocity.y -= delta * 0.5; // Gravity
            child.scale.multiplyScalar(0.95); // Shrink
            child.rotation.x += spin.x;
            child.rotation.y += spin.y;
            child.rotation.z += spin.z;
        });
    }
  });

  const instanceSeed = hashString(React.useId());
  const particles = useMemo(() => {
      return Array.from({ length: count }).map((_, index) => {
          const seed = instanceSeed + index * 11;
          return {
          position: [0, 2, 0] as [number, number, number],
          velocity: [
              (seededRatio(seed) - 0.5) * 0.2,
              seededRatio(seed + 1) * 0.2 + 0.1,
              (seededRatio(seed + 2) - 0.5) * 0.2
          ] as [number, number, number],
          spin: {
            x: (seededRatio(seed + 3) - 0.5) * 0.2,
            y: (seededRatio(seed + 4) - 0.5) * 0.2,
            z: (seededRatio(seed + 5) - 0.5) * 0.2
          },
          scale: seededRatio(seed + 6) * 0.3 + 0.1,
          color: color
          };
      });
  }, [count, color, instanceSeed]);

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
    const instanceSeed = hashString(React.useId());
    const speed = useMemo(() => 0.4 + seededRatio(instanceSeed) * 0.4, [instanceSeed]);
    const radius = useMemo(() => 6 + seededRatio(instanceSeed + 1) * 4, [instanceSeed]);
    const yOffset = useMemo(() => 6 + seededRatio(instanceSeed + 2) * 2, [instanceSeed]);
    const startPhase = useMemo(() => seededRatio(instanceSeed + 3) * Math.PI * 2, [instanceSeed]);

    useGameLoop(({ clock }) => {
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

export const Butterfly = ({ flowers }: { flowers: FlowerPosition[] }) => {
    const ref = useRef<THREE.Group>(null);
    const [activity, setActivity] = useState<'flutter' | 'hover' | 'zip' | 'land'>('flutter');
    const timer = useRef(0);
    const targetPos = useRef(new THREE.Vector3());
    const instanceSeed = hashString(React.useId());
    const behaviorSeed = useRef(instanceSeed + 131);
    const direction = useMemo(() => new THREE.Vector3(), []);
    const targetQuaternion = useMemo(() => new THREE.Quaternion(), []);
    const forward = useMemo(() => new THREE.Vector3(0, 0, 1), []);
    const color = useMemo(() => ['#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#2dd4bf'][Math.floor(seededRatio(instanceSeed) * 5)], [instanceSeed]);
    const basePos = useMemo(() => [(seededRatio(instanceSeed + 1) - 0.5) * 10, 2 + seededRatio(instanceSeed + 2) * 2, (seededRatio(instanceSeed + 3) - 0.5) * 10], [instanceSeed]);

    useGameLoop((state, delta) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime;
        timer.current -= delta;

        if (timer.current <= 0) {
            const choices: typeof activity[] = ['flutter', 'hover', 'zip', 'land'];
            const newActivity = choices[Math.floor(nextSeededRatio(behaviorSeed) * choices.length)];
            setActivity(newActivity);
            timer.current = 3 + nextSeededRatio(behaviorSeed) * 4;
            
            if (newActivity === 'land' && flowers.length > 0) {
                const flower = flowers[Math.floor(nextSeededRatio(behaviorSeed) * flowers.length)];
                targetPos.current.set(flower.x, 0.45, flower.z);
            } else {
                targetPos.current.set(
                    (nextSeededRatio(behaviorSeed) - 0.5) * 8,
                    1 + nextSeededRatio(behaviorSeed) * 2,
                    (nextSeededRatio(behaviorSeed) - 0.5) * 8
                );
            }
        }

        const moveSpeed = activity === 'zip' ? 0.08 : (activity === 'land' ? 0.04 : (activity === 'hover' ? 0.01 : 0.03));
        ref.current.position.lerp(targetPos.current, moveSpeed);
        
        if (activity !== 'land' || ref.current.position.distanceTo(targetPos.current) > 0.1) {
            ref.current.position.y += Math.sin(t * 10) * 0.015;
        }

        direction.copy(targetPos.current).sub(ref.current.position).normalize();
        if (direction.lengthSq() > 0.001) {
            targetQuaternion.setFromUnitVectors(forward, direction);
            ref.current.quaternion.slerp(targetQuaternion, 0.05);
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
    const groupRef = useRef<THREE.Group>(null);
    const textMeshRef = useRef<THREE.Mesh>(null);
    const opacityRef = useRef(1);
    const completedRef = useRef(false);
    const [isVisible, setIsVisible] = React.useState(true);
    
    useGameLoop((_, delta) => {
        if (!groupRef.current || completedRef.current) return;

        groupRef.current.position.y += delta * 1.5;
        opacityRef.current = Math.max(0, opacityRef.current - delta * 0.8);

        const textMesh = textMeshRef.current as (THREE.Mesh & { fillOpacity?: number; outlineOpacity?: number; sync?: () => void }) | null;
        if (textMesh) {
            textMesh.fillOpacity = opacityRef.current;
            textMesh.outlineOpacity = opacityRef.current;
            textMesh.sync?.();
        }

        if (opacityRef.current <= 0) {
            completedRef.current = true;
            setIsVisible(false);
            onComplete?.();
        }
    });

    if (!isVisible) return null;

    return (
        <group ref={groupRef} position={position}>
            <Float speed={5} rotationIntensity={0.2} floatIntensity={0.2}>
               <Text
                 ref={textMeshRef}
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
                 fillOpacity={1}
                 outlineOpacity={1}
               >
                 {text}
               </Text>
            </Float>
        </group>
    );
};

export const Fireflies = ({ count = 20, quality = 'medium', color = '#fef08a' }: { count?: number, quality?: string, color?: string }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const instanceSeed = hashString(React.useId());
    const effectiveCount = quality === 'medium' ? Math.floor(count / 2) : count;

    const particles = useMemo(() => {
        return Array.from({ length: effectiveCount }, (_, index) => {
            const seed = instanceSeed + index * 13;
            return {
                speed: 0.2 + seededRatio(seed) * 0.3,
                radius: 4 + seededRatio(seed + 1) * 6,
                yBase: 1 + seededRatio(seed + 2) * 3,
                seed: seededRatio(seed + 3) * Math.PI * 2,
                floatSpeed: 0.5 + seededRatio(seed + 4) * 0.5
            };
        });
    }, [effectiveCount, instanceSeed]);

    useGameLoop((state) => {
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

    if (quality === 'low') return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, effectiveCount]}>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshStandardMaterial 
                color={color}
                emissive={color}
                emissiveIntensity={2} 
                transparent 
                opacity={0.8} 
            />
        </instancedMesh>
    );
};

export const FallingPetals = ({ count = 50, theme, quality = 'medium' }: { count?: number, theme: EnvironmentTheme, quality?: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const instanceSeed = hashString(React.useId());
  
  const effectiveCount = quality === 'low' ? 0 : quality === 'medium' ? Math.floor(count / 2) : count;

  const particles = useMemo(() => {
    if (effectiveCount === 0) return [];
    return Array.from({ length: effectiveCount }, (_, index) => {
      const seed = instanceSeed + index * 17;
      return {
      position: [
        (seededRatio(seed) - 0.5) * 20,
        seededRatio(seed + 1) * 10 + 5,
        (seededRatio(seed + 2) - 0.5) * 20
      ] as [number, number, number],
      rotation: [seededRatio(seed + 3) * Math.PI, seededRatio(seed + 4) * Math.PI, 0] as [number, number, number],
      speed: seededRatio(seed + 5) * 0.02 + 0.01,
      wobble: seededRatio(seed + 6) * 0.1,
      wobblePhase: seededRatio(seed + 7) * Math.PI * 2,
      resetSeed: seed + 101
      };
    });
  }, [effectiveCount, instanceSeed]);

  useGameLoop((state) => {
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
        p.resetSeed = advanceSeed(p.resetSeed);
        p.position[0] = (p.resetSeed / 4294967296 - 0.5) * 20;
        p.resetSeed = advanceSeed(p.resetSeed);
        p.position[2] = (p.resetSeed / 4294967296 - 0.5) * 20;
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
