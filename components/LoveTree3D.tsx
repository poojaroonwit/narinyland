
import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Stars, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Emotion } from '../types';

// ─── TYPES ───────────────────────────────────────────────────────────

interface LoveTree3DProps {
  anniversaryDate: string;
  treeStyle?: string;
  petEmotion: Emotion;
  petMessage: string;
  level: number;
  daysPerTree: number;
  daysPerFlower?: number;
  flowerType?: string;
  mixedFlowers?: string[];
  leaves: number;
  points: number;
  onAddLeaf: () => void;
  skyMode?: string;
}

const THEMES: Record<string, any> = {
  oak: {
    trunk: '#8B4513',
    leaves: ['#4ade80', '#22c55e', '#16a34a', '#15803d'],
    bg: '#f0fdf4',
    ground: '#86efac',
    particle: '#22c55e'
  },
  sakura: {
    trunk: '#5D4037',
    leaves: ['#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899'],
    bg: '#fff1f2',
    ground: '#fce7f3',
    particle: '#f472b6'
  },
  neon: {
    trunk: '#4c1d95',
    leaves: ['#22d3ee', '#818cf8', '#c084fc', '#e879f9'],
    bg: '#0f172a',
    ground: '#1e1b4b',
    particle: '#c084fc'
  },
  frozen: {
    trunk: '#475569',
    leaves: ['#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8'],
    bg: '#f0f9ff',
    ground: '#e0f2fe',
    particle: '#38bdf8'
  },
  golden: {
    trunk: '#78350f',
    leaves: ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706'],
    bg: '#fffbeb',
    ground: '#fde68a',
    particle: '#f59e0b'
  },
  midnight: {
    trunk: '#2d3436',
    leaves: ['#a29bfe', '#6c5ce7', '#fd79a8', '#e84393'],
    bg: '#1e1e2e',
    ground: '#2d2b55',
    particle: '#fd79a8'
  }
};

// ─── COMPONENTS ──────────────────────────────────────────────────────

// Individual Leaf with fluttering animation
const Leaf = ({ position, scale, color, offset, windFactor = 1 }: { position: [number, number, number], scale: number, color: string, offset: number, windFactor?: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      // Fluttering effect influenced by windFactor
      meshRef.current.rotation.x = Math.sin(t * windFactor + offset) * (0.15 * windFactor);
      meshRef.current.rotation.z = Math.cos(t * 0.8 * windFactor + offset) * (0.2 * windFactor);
      // Subtle float
      meshRef.current.position.y = position[1] + Math.sin(t * 0.5 * windFactor + offset) * (0.05 * windFactor);
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={[scale, scale * 0.4, scale * 0.7]} castShadow receiveShadow>
      <sphereGeometry args={[0.6, 8, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Ambient Falling Leaf
const FallingLeaf = ({ theme }: { theme: any }) => {
    const ref = useRef<THREE.Group>(null);
    const { position, rotation, speed, color, drift } = useMemo(() => {
        const r = Math.random();
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
        if (!ref.current) return;
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

    return (
        <group ref={ref} position={position} rotation={rotation}>
             <mesh scale={[0.15, 0.04, 0.12]}>
                <sphereGeometry args={[1, 6, 6]} />
                <meshStandardMaterial color={color} transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

// Structural Tree Branch with attached leaves
const Branch = ({ position, rotation, scale, color, theme, leafCount, windFactor }: { 
    position: [number, number, number], 
    rotation: [number, number, number], 
    scale: [number, number, number], 
    color: string,
    theme: any,
    leafCount: number,
    windFactor: number
}) => {
    // Generate leaves relative to the branch's local coordinate system (the tip)
    const branchLeaves = useMemo(() => {
        const pos = [];
        for(let i=0; i<leafCount; i++) {
            // Sine-hash for stability within the branch
            const sin1 = Math.sin(i * 123.456 + position[0]) * 10000;
            const r1 = sin1 - Math.floor(sin1);
            const sin2 = Math.sin(i * 789.012 + position[1]) * 10000;
            const r2 = sin2 - Math.floor(sin2);
            const sin3 = Math.sin(i * 456.789 + position[2]) * 10000;
            const r3 = sin3 - Math.floor(sin3);

            // Cluster leaves around the end of the branch [0, 0.6, 0]
            const spread = 0.5 + r1 * 0.3;
            const theta = r2 * Math.PI * 2;
            const phi = r3 * Math.PI;
            
            // Local coordinates relative to branch center
            const lx = Math.sin(phi) * Math.cos(theta) * spread;
            const ly = 0.5 + Math.cos(phi) * spread; // Centered near the top of the branch
            const lz = Math.sin(phi) * Math.sin(theta) * spread;

            pos.push({
                position: [lx, ly, lz] as [number, number, number],
                scale: 0.3 + r1 * 0.4,
                color: theme.leaves[Math.floor(r2 * theme.leaves.length)],
                offset: r3 * Math.PI * 2
            });
        }
        return pos;
    }, [leafCount, theme, position]);

    return (
        <group position={position} rotation={rotation}>
            {/* Main Branch segment */}
            <mesh scale={scale} castShadow receiveShadow>
                <cylinderGeometry args={[0.04, 0.1, 1.2, 8]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {/* Twigs */}
            <mesh position={[0, 0.4, 0.05]} rotation={[0.4, 0, 0.2]} scale={[0.5, 0.6, 0.5]} castShadow>
                <cylinderGeometry args={[0.02, 0.04, 0.5, 6]} />
                <meshStandardMaterial color={color} />
            </mesh>
            
            {/* Attached Leaves */}
            {branchLeaves.map((leaf, i) => (
                <Leaf 
                    key={i} 
                    position={leaf.position} 
                    scale={leaf.scale} 
                    color={leaf.color} 
                    offset={leaf.offset}
                    windFactor={windFactor}
                />
            ))}
        </group>
    );
};

const Tree = ({ theme, scale = 1, leafCount, windFactor = 1 }: { theme: any; scale?: number; leafCount: number; windFactor?: number }) => {
  const group = useRef<THREE.Group>(null);
  const [pulse, setPulse] = useState(1);
  const prevLeafCount = useRef(leafCount);

  // Generate Stable Branch Structure
  const branches = useMemo(() => {
    return [
      { pos: [0.3, 1.8, 0] as [number, number, number], rot: [0, 0, -Math.PI / 3.5] as [number, number, number], scl: [1, 1.5, 1] as [number, number, number] },
      { pos: [-0.3, 2.0, 0] as [number, number, number], rot: [0, 0, Math.PI / 3.5] as [number, number, number], scl: [0.8, 1.3, 0.8] as [number, number, number] },
      { pos: [0, 2.2, 0.3] as [number, number, number], rot: [-Math.PI / 3.5, 0, 0] as [number, number, number], scl: [0.7, 1.2, 0.7] as [number, number, number] },
      { pos: [0, 1.9, -0.3] as [number, number, number], rot: [Math.PI / 3.5, 0, 0] as [number, number, number], scl: [0.7, 1.2, 0.7] as [number, number, number] },
      { pos: [0.2, 2.4, 0.2] as [number, number, number], rot: [-Math.PI / 6, 0, -Math.PI / 6] as [number, number, number], scl: [0.5, 1.0, 0.5] as [number, number, number] },
      { pos: [-0.2, 2.5, -0.2] as [number, number, number], rot: [Math.PI / 6, 0, Math.PI / 6] as [number, number, number], scl: [0.5, 1.0, 0.5] as [number, number, number] },
    ];
  }, []);

  // Trigger pulse animation when leafCount increases
  React.useEffect(() => {
    if (leafCount > prevLeafCount.current) {
        setPulse(1.5); // Initial jump
        prevLeafCount.current = leafCount;
    }
  }, [leafCount]);
  
  // Calculate individual branch leaf counts
  const leavesPerBranch = Math.floor(Math.min(leafCount, 400) / branches.length);
  const extraLeaves = Math.min(leafCount, 400) % branches.length;

  // Gentle swaying animation + Growth pulse lerp
  useFrame(({ clock }) => {
    if (group.current) {
        // Wind sway
        group.current.rotation.z = Math.sin(clock.elapsedTime * 0.4 * windFactor) * (0.015 * windFactor);
        group.current.rotation.x = Math.cos(clock.elapsedTime * 0.3 * windFactor) * (0.015 * windFactor);
        
        // Pulse lerp back to 1
        if (pulse > 1) {
            setPulse(THREE.MathUtils.lerp(pulse, 1, 0.1));
            group.current.scale.setScalar(scale * pulse);
        } else {
            group.current.scale.setScalar(scale);
        }
    }
  });

  return (
    <group ref={group} scale={scale}>
      {/* Organic Trunk with Roots */}
      <group>
        {/* Main Trunk Segments for Gnarled Look */}
        {[
          { y: 0.4, s: [0.35, 0.8, 0.35], r: [0, 0, 0.05] },
          { y: 1.1, s: [0.28, 0.8, 0.28], r: [0.05, 0, -0.05] },
          { y: 1.7, s: [0.22, 0.8, 0.22], r: [-0.05, 0, 0.02] }
        ].map((seg, i) => (
          <mesh key={i} position={[0, seg.y, 0]} rotation={seg.r as [number, number, number]} castShadow receiveShadow>
            <cylinderGeometry args={[seg.s[0]*0.8, seg.s[0], seg.s[1], 8]} />
            <meshStandardMaterial color={theme.trunk} roughness={1} />
          </mesh>
        ))}

        {/* Spreading Roots */}
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = (i / 5) * Math.PI * 2;
          return (
            <mesh 
              key={`root-${i}`} 
              position={[Math.cos(angle) * 0.2, 0.05, Math.sin(angle) * 0.2]} 
              rotation={[Math.PI / 2.2, 0, angle]}
            >
              <capsuleGeometry args={[0.08, 0.4, 4, 8]} />
              <meshStandardMaterial color={theme.trunk} roughness={1} />
            </mesh>
          );
        })}
      </group>

      {/* Foliage Core (Adds depth and hides branch intersections) */}
      <mesh position={[0, 2.8, 0]} scale={[2.5, 2.0, 2.5]}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial 
            color={theme.leaves[0]} 
            transparent 
            opacity={0.4} 
            emissive={theme.leaves[0]} 
            emissiveIntensity={0.2}
            flatShading 
          />
      </mesh>

      {/* Branches */}
      <group>
          {branches.map((br, i) => (
              <Branch 
                key={i} 
                position={br.pos} 
                rotation={br.rot} 
                scale={br.scl} 
                color={theme.trunk} 
                theme={theme}
                leafCount={leavesPerBranch + (i < extraLeaves ? 1 : 0)}
                windFactor={windFactor}
              />
          ))}
      </group>
    </group>
  );
};

const Pet3D = ({ emotion, theme }: { emotion: Emotion; theme: any }) => {
  const ref = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const [active, setActive] = useState(false);
  
  const colors = {
    primary: "#e69138", // Shiba Orange
    secondary: "#ffffff", // White markings
    nose: "#222"
  };

  const [activity, setActivity] = useState<'walk' | 'sit' | 'lie' | 'idle'>('idle');
  const activityTimer = useRef(0);
  const targetPos = useRef(new THREE.Vector3(2, 0, 2));

  useFrame((state, delta) => {
    if (ref.current && coreRef.current) {
        const t = state.clock.getElapsedTime();
        activityTimer.current -= delta;

        // 1. Natural Cycle State Machine
        if (activityTimer.current <= 0) {
            if (emotion === 'sleeping') {
                setActivity('lie');
                activityTimer.current = 10;
            } else {
                // Cycle: Walk -> Idle -> Sit -> Lie -> Sit -> Idle -> Walk
                const states: typeof activity[] = ['walk', 'idle', 'sit', 'lie'];
                const weights = [0.4, 0.2, 0.2, 0.2];
                const rand = Math.random();
                let acc = 0;
                for(let i=0; i<states.length; i++) {
                    acc += weights[i];
                    if (rand < acc) {
                        setActivity(states[i]);
                        break;
                    }
                }
                activityTimer.current = 4 + Math.random() * 6;
            }
            
            if (activity === 'walk') {
                const angle = Math.random() * Math.PI * 2;
                const dist = 1.5 + Math.random() * 3.5;
                targetPos.current.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
            }
        }

        const head = coreRef.current.children[2] as THREE.Group;
        
        // 2. Natural Animation Procedural Lerping
        let targetY = 0;
        let targetBodyRot = 0;
        let legRotX = [0, 0, 0, 0]; // FR, FL, BR, BL
        let legRotZ = [0, 0, 0, 0];

        switch(activity) {
            case 'walk':
                // Move towards target
                ref.current.position.lerp(targetPos.current, 0.02);
                const dir = targetPos.current.clone().sub(ref.current.position).normalize();
                if (dir.lengthSq() > 0.001) {
                    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
                    ref.current.quaternion.slerp(targetQuat, 0.1);
                }
                // Trot animation
                targetY = Math.abs(Math.sin(t * 10)) * 0.1;
                legRotX = [
                    Math.sin(t * 12) * 0.6,
                    Math.sin(t * 12 + Math.PI) * 0.6,
                    Math.sin(t * 12 + Math.PI) * 0.6,
                    Math.sin(t * 12) * 0.6
                ];
                if (head) head.rotation.x = Math.sin(t * 10) * 0.05;
                break;

            case 'sit':
                targetY = -0.15;
                targetBodyRot = -Math.PI / 10; // Tilt body back
                legRotX = [0, 0, -1.2, -1.2]; // Back legs fold
                if (head) {
                    head.rotation.x = -0.1 + Math.sin(t * 0.5) * 0.2;
                    head.rotation.y = Math.sin(t * 0.3) * 0.4; // Look around curiously
                }
                break;

            case 'lie':
                targetY = -0.3;
                targetBodyRot = 0;
                legRotX = [-Math.PI / 2.2, -Math.PI / 2.2, -Math.PI / 2.2, -Math.PI / 2.2]; // All legs flat
                if (head) {
                    head.rotation.x = 0.2; // Head down
                    head.rotation.y = Math.sin(t * 0.2) * 0.1;
                }
                break;

            default: // idle
                targetY = Math.sin(t * 2) * 0.02;
                if (head) {
                    head.rotation.x = Math.sin(t * 1) * 0.1;
                    head.rotation.y = Math.sin(t * 0.5) * 0.3;
                }
                break;
        }

        // Apply Lerps for smoothness
        coreRef.current.position.y = THREE.MathUtils.lerp(coreRef.current.position.y, targetY, 0.1);
        coreRef.current.rotation.x = THREE.MathUtils.lerp(coreRef.current.rotation.x, targetBodyRot, 0.1);
        
        // --- หันหน้า (Head Look Logic) ---
        if (headRef.current) {
            let headX = 0;
            let headY = 0;

            if (activity === 'walk') {
               headX = Math.sin(t * 10) * 0.1; // Bobbing while walking
            } else {
               // Look towards camera (User)
               const cameraPos = state.camera.position.clone();
               // Convert camera position to the coordinate system of the head's parent
               const localLook = headRef.current.parent!.worldToLocal(cameraPos);
               
               // Calculate angles to look at user
               headY = Math.atan2(localLook.x, localLook.z);
               headX = -Math.atan2(localLook.y, Math.sqrt(localLook.x * localLook.x + localLook.z * localLook.z));
               
               // Clamp for natural animal neck limits
               headY = THREE.MathUtils.clamp(headY, -Math.PI / 2.5, Math.PI / 2.5);
               headX = THREE.MathUtils.clamp(headX, -Math.PI / 4, Math.PI / 6);
               
               // Add gentle idle sway
               headY += Math.sin(t * 0.5) * 0.1;
               headX += Math.cos(t * 0.3) * 0.05;
            }

            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, headX, 0.1);
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, headY, 0.1);
        }

        legRefs.forEach((leg, i) => {
            if (leg.current) {
                leg.current.rotation.x = THREE.MathUtils.lerp(leg.current.rotation.x, legRotX[i], 0.1);
                leg.current.rotation.z = THREE.MathUtils.lerp(leg.current.rotation.z, legRotZ[i], 0.1);
            }
        });

        // 3. Global Procedural Bits
        if (tailRef.current) {
            const wagSpeed = (activity === 'walk' || emotion === 'excited') ? 15 : 2;
            tailRef.current.rotation.z = (Math.PI / 8) + Math.sin(t * wagSpeed) * 0.2;
        }

        const hitScale = active ? 1.3 : 1;
        ref.current.scale.lerp(new THREE.Vector3(hitScale, hitScale, hitScale), 0.1);
    }
  });

  return (
    <group 
        ref={ref} 
        position={[2, 0, 2]}
    >
        <group ref={coreRef}>
            {/* Body */}
            <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <capsuleGeometry args={[0.25, 0.45, 4, 8]} />
                <meshStandardMaterial color={colors.primary} />
            </mesh>
            {/* White Underbelly */}
            <mesh position={[0, 0.38, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.2, 0.4, 4, 8]} />
                <meshStandardMaterial color={colors.secondary} transparent opacity={0.6} />
            </mesh>

            {/* Head */}
            <group ref={headRef} position={[0, 0.7, 0.35]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.28, 16, 16]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                {/* Face White Patch */}
                <mesh position={[0, -0.05, 0.1]} scale={[1, 0.8, 1]}>
                    <sphereGeometry args={[0.22, 12, 12]} />
                    <meshStandardMaterial color={colors.secondary} />
                </mesh>
                
                {/* Snout/Muzzle */}
                <group position={[0, -0.05, 0.25]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.15, 0.12, 0.15]} />
                        <meshStandardMaterial color={colors.secondary} />
                    </mesh>
                    {/* Nose */}
                    <mesh position={[0, 0.04, 0.08]}>
                        <sphereGeometry args={[0.03, 8, 8]} />
                        <meshStandardMaterial color={colors.nose} />
                    </mesh>
                </group>

                {/* Eyes */}
                <mesh position={[0.12, 0.08, 0.2]}>
                    <sphereGeometry args={[0.035, 8, 8]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
                <mesh position={[-0.12, 0.08, 0.2]}>
                    <sphereGeometry args={[0.035, 8, 8]} />
                    <meshStandardMaterial color="#111" />
                </mesh>

                {/* Ears */}
                <mesh position={[0.18, 0.22, 0.1]} rotation={[0.2, 0, -0.3]}>
                    <coneGeometry args={[0.08, 0.2, 4]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                <mesh position={[-0.18, 0.22, 0.1]} rotation={[0.2, 0, 0.3]}>
                    <coneGeometry args={[0.08, 0.2, 4]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
            </group>

            {/* Curly Tail */}
            <group ref={tailRef} position={[0, 0.6, -0.45]} rotation={[-0.5, 0, 0]}>
                <mesh castShadow>
                    <torusGeometry args={[0.12, 0.05, 8, 16, Math.PI * 1.5]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                    <sphereGeometry args={[0.07, 8, 8]} />
                    <meshStandardMaterial color={colors.secondary} />
                </mesh>
            </group>

            {/* Legs */}
            {[
                { p: [0.15, 0.25, 0.2], r: legRefs[0] }, // Front Right
                { p: [-0.15, 0.25, 0.2], r: legRefs[1] }, // Front Left
                { p: [0.15, 0.25, -0.2], r: legRefs[2] }, // Back Right
                { p: [-0.15, 0.25, -0.2], r: legRefs[3] }  // Back Left
            ].map((leg, i) => (
                <group key={i} position={leg.p as [number, number, number]} ref={leg.r}>
                    <mesh position={[0, -0.15, 0]} castShadow>
                        <boxGeometry args={[0.08, 0.3, 0.08]} />
                        <meshStandardMaterial color={i < 2 ? colors.primary : colors.primary} />
                    </mesh>
                    {/* White Paws */}
                    <mesh position={[0, -0.3, 0.02]}>
                        <boxGeometry args={[0.09, 0.05, 0.12]} />
                        <meshStandardMaterial color={colors.secondary} />
                    </mesh>
                </group>
            ))}
        </group>

        {/* Emotion Particles */}
        {(emotion === 'excited' || emotion === 'playing' || active) && (
             <Float speed={5} rotationIntensity={0} floatIntensity={0.5}>
                 <Text position={[0, 1.8, 0]} fontSize={0.5} outlineWidth={0.02} outlineColor="#ffffff">
                    {emotion === 'excited' ? '❤️' : '🎵'}
                 </Text>
             </Float>
        )}
        {emotion === 'sleeping' && (
             <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
                 <Text position={[0.5, 1.5, 0]} fontSize={0.4} color="#818cf8">Zzz</Text>
             </Float>
        )}
    </group>
  );
};

const Flower = ({ type, position, scale = 1, windFactor = 1 }: { type: string, position: [number, number, number], scale?: number, windFactor?: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const stemColor = "#15803d";
    const seed = useMemo(() => Math.random() * Math.PI * 2, []);
    
    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.getElapsedTime();
            // Organic swaying in the wind
            groupRef.current.rotation.x = Math.sin(t * 1.5 * windFactor + seed) * (0.1 * windFactor);
            groupRef.current.rotation.z = Math.cos(t * 1.2 * windFactor + seed) * (0.05 * windFactor);
        }
    });
    
    return (
        <group position={position} scale={scale} ref={groupRef}>
            {/* Stem */}
            <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.025, 0.4]} />
                <meshStandardMaterial color={stemColor} />
            </mesh>

            {/* Bloom */}
            <group position={[0, 0.4, 0]}>
                {type === 'sunflower' && (
                    <group>
                        {/* Petals */}
                        {Array.from({ length: 12 }).map((_, i) => (
                            <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]} position={[0, 0, 0]}>
                                <mesh position={[0.15, 0, 0]}>
                                    <sphereGeometry args={[0.12, 8, 2]} scale={[1, 0.3, 1]} />
                                    <meshStandardMaterial color="#fbbf24" emissive="#78350f" emissiveIntensity={0.2} />
                                </mesh>
                            </mesh>
                        ))}
                        {/* Center */}
                        <mesh position={[0, 0, 0.02]}>
                            <circleGeometry args={[0.1, 16]} />
                            <meshStandardMaterial color="#451a03" roughness={1} />
                        </mesh>
                    </group>
                )}
                {type === 'tulip' && (
                    <group>
                         <mesh castShadow>
                            <sphereGeometry args={[0.15, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.5]} />
                            <meshStandardMaterial color="#f43f5e" emissive="#be123c" emissiveIntensity={0.3} />
                        </mesh>
                        <mesh position={[0, -0.05, 0]}>
                             <cylinderGeometry args={[0.15, 0.05, 0.2, 12]} />
                             <meshStandardMaterial color="#f43f5e" />
                        </mesh>
                    </group>
                )}
                {type === 'rose' && (
                    <group>
                        <mesh castShadow>
                            <torusKnotGeometry args={[0.12, 0.05, 64, 8, 2, 3]} />
                            <meshStandardMaterial color="#be123c" roughness={0.3} emissive="#881337" emissiveIntensity={0.5} />
                        </mesh>
                        {/* Outer Petals */}
                        {Array.from({ length: 5 }).map((_, i) => (
                            <mesh key={i} rotation={[1.2, (i / 5) * Math.PI * 2, 0]} position={[0, 0, 0]}>
                                <sphereGeometry args={[0.15, 8, 8, 0, Math.PI, 0, Math.PI / 2]} />
                                <meshStandardMaterial color="#9f1239" side={THREE.DoubleSide} />
                            </mesh>
                        ))}
                    </group>
                )}
                {type === 'cherry' && (
                    <group>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0.5]} position={[0, 0, 0]}>
                                <sphereGeometry args={[0.1, 8, 8]} scale={[1.2, 0.4, 1]} />
                                <meshStandardMaterial color="#fbcfe8" transparent opacity={0.9} />
                            </mesh>
                        ))}
                        <mesh>
                            <sphereGeometry args={[0.04, 8, 8]} />
                            <meshStandardMaterial color="#f472b6" />
                        </mesh>
                    </group>
                )}
                {type === 'lavender' && (
                    <group>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <mesh key={i} position={[0, i * 0.06, 0]}>
                                <sphereGeometry args={[0.05 - i * 0.005, 6, 6]} />
                                <meshStandardMaterial color="#a78bfa" emissive="#6d28d9" emissiveIntensity={0.4} />
                            </mesh>
                        ))}
                    </group>
                )}
                {type === 'cactus' && (
                    <group>
                        <mesh position={[0, 0.1, 0]}>
                            <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
                            <meshStandardMaterial color="#166534" flatShading />
                        </mesh>
                        {/* Spikes */}
                        {Array.from({ length: 12 }).map((_, i) => (
                             <mesh key={i} position={[Math.cos(i) * 0.12, 0.1 + (i % 3) * 0.05, Math.sin(i) * 0.12]} rotation={[0, 0, Math.PI / 2]}>
                                <coneGeometry args={[0.005, 0.04, 3]} />
                                <meshStandardMaterial color="white" />
                             </mesh>
                        ))}
                    </group>
                )}
                {type === 'heart' && (
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        <group scale={0.4} rotation={[0, 0, Math.PI]}>
                            <mesh position={[0.1, 0, 0]}>
                                <sphereGeometry args={[0.15, 16, 16]} />
                                <meshStandardMaterial color="#f43f5e" emissive="#fb7185" emissiveIntensity={0.5} />
                            </mesh>
                            <mesh position={[-0.1, 0, 0]}>
                                <sphereGeometry args={[0.15, 16, 16]} />
                                <meshStandardMaterial color="#f43f5e" emissive="#fb7185" emissiveIntensity={0.5} />
                            </mesh>
                            <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
                                <coneGeometry args={[0.26, 0.4, 16]} />
                                <meshStandardMaterial color="#f43f5e" emissive="#fb7185" emissiveIntensity={0.5} />
                            </mesh>
                        </group>
                    </Float>
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

const Grass = ({ position, windFactor = 1 }: { position: [number, number, number], windFactor?: number }) => {
    const groupRef = useRef<THREE.Group>(null);
    const seed = useMemo(() => Math.random() * Math.PI * 2, []);
    
    useFrame((state) => {
        if (groupRef.current) {
            const t = state.clock.getElapsedTime();
            groupRef.current.rotation.x = Math.sin(t * 2 * windFactor + seed) * (0.05 * windFactor);
            groupRef.current.rotation.z = Math.cos(t * 1.5 * windFactor + seed) * (0.03 * windFactor);
        }
    });

    return (
        <group position={position} ref={groupRef}>
            {/* Clump of blades */}
            {Array.from({ length: 3 }).map((_, i) => (
                <mesh 
                    key={i} 
                    position={[(i - 1) * 0.05, 0.15, 0]} 
                    rotation={[0.1 * (i - 1), 0, 0]}
                    castShadow
                >
                    <coneGeometry args={[0.02, 0.4, 3]} />
                    <meshStandardMaterial color={i === 1 ? "#4ade80" : "#22c55e"} />
                </mesh>
            ))}
        </group>
    );
};

const Bird = () => {
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
            {/* Wings with better shape */}
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
                {/* Beak */}
                <mesh position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.02, 0.08, 4]} />
                    <meshStandardMaterial color="#f59e0b" />
                </mesh>
            </group>
        </group>
    );
};

const Butterfly = ({ flowers }: { flowers: any[] }) => {
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

        // 1. Behavior State Machine
        if (timer.current <= 0) {
            const choices: typeof activity[] = ['flutter', 'hover', 'zip', 'land'];
            const newActivity = choices[Math.floor(Math.random() * choices.length)];
            setActivity(newActivity);
            timer.current = 3 + Math.random() * 4;
            
            if (newActivity === 'land' && flowers.length > 0) {
                // Land on a specific flower
                const flower = flowers[Math.floor(Math.random() * flowers.length)];
                targetPos.current.set(flower.x, 0.45, flower.z); // Sit on top of flower bloom
            } else {
                // New random air target
                targetPos.current.set(
                    (Math.random() - 0.5) * 8,
                    1 + Math.random() * 2,
                    (Math.random() - 0.5) * 8
                );
            }
        }

        // 2. Movement Logic
        const moveSpeed = activity === 'zip' ? 0.08 : (activity === 'land' ? 0.04 : (activity === 'hover' ? 0.01 : 0.03));
        ref.current.position.lerp(targetPos.current, moveSpeed);
        
        // Add organic jitter (stopped when landed)
        if (activity !== 'land' || ref.current.position.distanceTo(targetPos.current) > 0.1) {
            ref.current.position.y += Math.sin(t * 10) * 0.015;
        }

        // 3. Orientation
        const dir = targetPos.current.clone().sub(ref.current.position).normalize();
        if (dir.lengthSq() > 0.001) {
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
            ref.current.quaternion.slerp(targetQuat, 0.05);
        }
        
        // Bank based on movement
        ref.current.rotation.z = Math.sin(t * 5) * 0.2;

        // 4. Wing Flap Logic
        const wingFL = ref.current.children[0] as THREE.Group; // Front Wing L
        const wingFR = ref.current.children[1] as THREE.Group; // Front Wing R
        const wingBL = ref.current.children[2] as THREE.Group; // Back Wing L
        const wingBR = ref.current.children[3] as THREE.Group; // Back Wing R

        if (wingFL && wingFR && wingBL && wingBR) {
            const isLanded = activity === 'land' && ref.current.position.distanceTo(targetPos.current) < 0.2;
            const flapSpeed = isLanded ? 1 : (activity === 'zip' ? 30 : (activity === 'hover' ? 12 : 20));
            const flapAngle = isLanded ? 0.2 : (activity === 'hover' ? 0.6 : 1.2);
            
            const wingAngle = Math.sin(t * flapSpeed) * flapAngle;
            wingFL.rotation.y = wingAngle;
            wingFR.rotation.y = -wingAngle;
            wingBL.rotation.y = wingAngle * 0.8; // Back wings follow with less range
            wingBR.rotation.y = -wingAngle * 0.8;
        }
    });

    return (
        <group ref={ref} position={basePos as [number, number, number]}>
            {/* Front Wings */}
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
            
            {/* Back Wings */}
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

            {/* Body */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.015, 0.15, 4, 8]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            
            {/* Antennae */}
            <mesh position={[0.02, 0.02, 0.08]} rotation={[-0.3, 0.2, 0]}>
                <cylinderGeometry args={[0.002, 0.002, 0.1]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[-0.02, 0.02, 0.08]} rotation={[-0.3, -0.2, 0]}>
                <cylinderGeometry args={[0.002, 0.002, 0.1]} />
                <meshStandardMaterial color="#111" />
            </mesh>

            {/* Trail during zip */}
            {activity === 'zip' && <Sparkles count={5} scale={0.5} size={1} speed={2} color={color} />}
        </group>
    );
}

const GardenProp = ({ position, type }: { position: [number, number, number], type: 'rock' | 'fence' }) => {
    return (
        <group position={position}>
            {type === 'rock' && (
                <group>
                    {/* Main Rock Body */}
                    <mesh position={[0, 0.2, 0]} rotation={[0.5, 0.2, 0]} castShadow>
                        <dodecahedronGeometry args={[0.4, 0]} />
                        <meshStandardMaterial color="#64748b" flatShading />
                    </mesh>
                    {/* Small Attached Rock */}
                    <mesh position={[0.3, 0.1, 0.2]} scale={0.6} rotation={[0, 0.5, 0.8]} castShadow>
                        <dodecahedronGeometry args={[0.3, 0]} />
                        <meshStandardMaterial color="#94a3b8" flatShading />
                    </mesh>
                    {/* Moss Patches */}
                    <mesh position={[0, 0.35, 0.1]} rotation={[-0.5, 0, 0]} scale={[0.4, 0.1, 0.3]}>
                        <sphereGeometry args={[1, 8, 8]} />
                        <meshStandardMaterial color="#166534" roughness={1} />
                    </mesh>
                    <mesh position={[0.2, 0.2, 0.3]} scale={[0.2, 0.05, 0.2]}>
                        <sphereGeometry args={[1, 8, 8]} />
                        <meshStandardMaterial color="#3f6212" roughness={1} />
                    </mesh>
                </group>
            )}
            {type === 'fence' && (
                <group>
                    {/* Horizontal Rails */}
                    <mesh position={[0, 0.25, 0]} castShadow>
                        <boxGeometry args={[1.2, 0.04, 0.04]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                    <mesh position={[0, 0.45, 0]} castShadow>
                        <boxGeometry args={[1.2, 0.04, 0.04]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                    {/* Vertical Pickets */}
                    {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
                        <mesh key={i} position={[x, 0.3, 0]} castShadow>
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

const Pond = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.getElapsedTime();
            // Simple ripple effect by moving texture offset or scale
            meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
        }
    });

    return (
        <group position={[6, -0.05, -6]} rotation={[-Math.PI / 2, 0, 0]}>
            {/* Water surface */}
            <mesh ref={meshRef}>
                <circleGeometry args={[3, 32]} />
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
                <circleGeometry args={[3.2, 32]} />
                <meshStandardMaterial color="#d4a373" />
            </mesh>
            {/* Reeds */}
            {Array.from({ length: 12 }).map((_, i) => {
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

const Fireflies = ({ count = 20 }: { count?: number }) => {
    return (
        <group>
            {Array.from({ length: count }).map((_, i) => {
                const seed = Math.random() * Math.PI * 2;
                const speed = 0.2 + Math.random() * 0.3;
                const radius = 4 + Math.random() * 6;
                const yBase = 1 + Math.random() * 3;

                return (
                    <Float 
                        key={i} 
                        speed={speed * 5} 
                        rotationIntensity={2} 
                        floatIntensity={2}
                        position={[
                            Math.sin(seed) * radius,
                            yBase,
                            Math.cos(seed) * radius
                        ]}
                    >
                        <mesh>
                            <sphereGeometry args={[0.03, 8, 8]} />
                            <meshStandardMaterial 
                                color="#fef08a" 
                                emissive="#fef08a" 
                                emissiveIntensity={2} 
                                transparent 
                                opacity={0.8} 
                            />
                        </mesh>
                    </Float>
                );
            })}
        </group>
    );
};


const StonePath = () => {
    return (
        <group>
            {[
                { x: 0, z: 1.5 }, { x: 0.2, z: 2.2 }, { x: 0.5, z: 2.9 }, 
                { x: 1.0, z: 3.5 }, { x: 1.6, z: 4.1 }, { x: 2.4, z: 4.6 }
            ].map((p, i) => (
                <mesh 
                    key={i} 
                    position={[p.x, -0.08, p.z]} 
                    rotation={[-Math.PI / 2, 0, Math.random()]}
                    receiveShadow
                >
                    <circleGeometry args={[0.3 + Math.random() * 0.1, 8]} />
                    <meshStandardMaterial color="#94a3b8" roughness={1} />
                </mesh>
            ))}
        </group>
    );
};

const LoveTree3D: React.FC<LoveTree3DProps> = ({ 
    anniversaryDate, treeStyle = 'oak', petEmotion, petMessage, level,
    leaves, points, onAddLeaf, daysPerFlower = 7, flowerType = 'sunflower',
    mixedFlowers = ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'],
    skyMode = 'follow_timezone'
}) => {
  const theme = THEMES[treeStyle] || THEMES['oak'];

  // Calculate Days Together
  const daysTogether = useMemo(() => {
    const start = new Date(anniversaryDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [anniversaryDate]);

  // Calculate Flower Count
  const flowerCount = Math.floor(daysTogether / daysPerFlower);

  // Generate Stable Flower Positions & Types with organic distribution
  const flowerPositions = useMemo(() => {
    const pos = [];
    const count = Math.min(flowerCount, 150); 
    const activeFlowers = (mixedFlowers && mixedFlowers.length > 0) 
      ? mixedFlowers 
      : ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'];

    for(let i=0; i<count; i++) {
        // Deterministic pseudo-random based on index
        const sin1 = Math.sin(i * 123.456) * 10000;
        const r1 = sin1 - Math.floor(sin1);
        const sin2 = Math.sin(i * 789.012) * 10000;
        const r2 = sin2 - Math.floor(sin2);
        const sin3 = Math.sin(i * 456.789) * 10000;
        const r3 = sin3 - Math.floor(sin3);

        // Phyllotaxis base with high "jitter" for natural look
        const angle = i * 137.5 + (r1 - 0.5) * 45; 
        const radius = 2.8 + Math.sqrt(i) * 0.7 + (r2 - 0.5) * 1.8;
        
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const z = Math.sin(angle * Math.PI / 180) * radius;
        
        // Random scale variation
        const s = 0.7 + r3 * 0.6;
        
        // Determinstic type
        const t = flowerType === 'mixed' ? activeFlowers[Math.floor(r1 * activeFlowers.length)] : flowerType;
        
        pos.push({ x, z, type: t, scale: s });
    }
    return pos;
  }, [flowerCount, flowerType, mixedFlowers]);
  
  // Generate Grass Positions
  const grassPositions = useMemo(() => {
    const pos = [];
    for(let i=0; i<30; i++) {
        const radius = 3 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        pos.push({ 
            x: Math.cos(angle) * radius, 
            z: Math.sin(angle) * radius 
        });
    }
    return pos;
  }, []);

  // Dynamic Sky based on Time
  const hour = useMemo(() => {
    if (skyMode === 'noon') return 12;
    if (skyMode === 'night') return 23;
    return new Date().getHours();
  }, [skyMode]);
  
  // Calculate Wind Factor based on Emotion
  const windFactor = useMemo(() => {
      switch(petEmotion) {
          case 'excited':
          case 'playing': return 2.2;
          case 'happy': return 1.0;
          case 'waiting':
          case 'thinking': return 0.7;
          case 'sleeping': return 0.3;
          case 'neutral': return 1.0;
          default: return 1.0;
      }
  }, [petEmotion]);

  const getSkyColor = () => {
      if (['neon', 'midnight'].includes(treeStyle)) return theme.bg; // Keep theme for dark styles
      if (hour >= 6 && hour < 17) return '#87CEEB'; // Day
      if (hour >= 17 && hour < 20) return '#FF7F50'; // Sunset
      return '#0f172a'; // Night
  };
  const skyColor = getSkyColor();

  return (
    <div className="fixed inset-0 -z-10 bg-black">
      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [0, 6, 14], fov: 50 }}>
         <color attach="background" args={[skyColor]} />
         
         <ambientLight intensity={hour >= 19 || hour < 6 ? 0.3 : 0.8} />
         <directionalLight 
            position={[5, 10, 5]} 
            intensity={hour >= 19 || hour < 6 ? 0.5 : 1.2} 
            castShadow 
            shadow-mapSize={[2048, 2048]} 
         />
         <fog attach="fog" args={[skyColor, 5, 30]} />
         
         {(hour >= 19 || hour < 6 || ['neon', 'midnight'].includes(treeStyle)) && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
         <Sparkles count={80} scale={15} size={3} speed={0.5} opacity={0.4} color={theme.particle} />
         
         {/* Extra Magic Particles for Happy Emotions */}
         {(petEmotion === 'excited' || petEmotion === 'playing') && (
             <Sparkles count={100} scale={8} size={6} speed={2} color="#fcd34d" noise={1} />
         )}

         <OrbitControls 
            enablePan={false} 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.1} 
            maxDistance={20} 
            minDistance={4} 
         />

         {/* Ground */}
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <circleGeometry args={[20, 64]} />
            <meshStandardMaterial color={theme.ground} />
         </mesh>

         {/* Tree */}
         <Tree theme={theme} scale={1.5} leafCount={leaves} windFactor={windFactor} />

         {/* Pet */}
         <Pet3D emotion={petEmotion} theme={theme} />

          {/* Garden Props */}
          <group>
             {/* Dynamic Flowers */}
             {flowerPositions.map((pos, i) => (
                <Flower 
                    key={i} 
                    position={[pos.x, 0, pos.z]} 
                    type={pos.type} 
                    scale={pos.scale} 
                    windFactor={windFactor} 
                />
             ))}

             {/* Wild Grass */}
             {grassPositions.map((pos, i) => (
                <Grass key={i} position={[pos.x, 0, pos.z]} windFactor={windFactor} />
             ))}

             {/* Butterflies */}
             <Butterfly flowers={flowerPositions} />
             <Butterfly flowers={flowerPositions} />
             <Butterfly flowers={flowerPositions} />

             {/* Ambient Falling Leaves */}
             {Array.from({ length: 10 }).map((_, i) => (
                 <FallingLeaf key={i} theme={theme} />
             ))}

             {/* Birds in the sky */}
             <Bird />
             <Bird />

             <GardenProp position={[-3, 0, 3]} type="rock" />
             <GardenProp position={[-4, 0, -3]} type="fence" />
             <GardenProp position={[-3.2, 0, -3]} type="fence" />
              
              <Pond />
              <Fireflies />
              <StonePath />
           </group>

         <ContactShadows scale={30} blur={2.5} far={4} opacity={0.4} />

      </Canvas>
      
 

    </div>
  );
};

export default LoveTree3D;
