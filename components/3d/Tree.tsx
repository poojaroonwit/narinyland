"use client";

import * as React from 'react';
import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// Deterministic pseudo-random from seed
function seededRandom(seed: number) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
}

// Heart Fruit component
const HeartFruit = ({ position, color, scale = 1 }: { position: [number, number, number], color: string, scale?: number }) => {
    return (
        <group position={position} scale={[0.15 * scale, 0.15 * scale, 0.15 * scale]}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[1, 1, 0.5]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[0.35, 0.35, 0]}>
                <sphereGeometry args={[0.5, 12, 12]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[-0.35, 0.35, 0]}>
                <sphereGeometry args={[0.5, 12, 12]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
        </group>
    );
};

// Instanced leaf rendering — 3D ellipsoid leaves visible from all angles
export const InstancedLeaves = ({ leaves, windFactor, quality }: { leaves: any[], windFactor: number, quality: string }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const segs = quality === 'low' ? 3 : (quality === 'medium' ? 4 : 5);

  useLayoutEffect(() => {
    if (!meshRef.current || leaves.length === 0) return;

    if (!meshRef.current.instanceColor || meshRef.current.instanceColor.count !== leaves.length) {
       meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(leaves.length * 3), 3);
    }
    
    leaves.forEach((leaf, i) => {
      dummy.position.set(leaf.position[0], leaf.position[1], leaf.position[2]);
      dummy.rotation.set(leaf.rotX || 0, leaf.rotY || 0, leaf.rotZ || 0);
      const s = leaf.scale;
      // Ellipsoid: wide, tall, thin — leaf-like proportions
      dummy.scale.set(s, s * 1.3, s * 0.25);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new THREE.Color(leaf.color));
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    
    if (meshRef.current.material) {
        (meshRef.current.material as THREE.Material).needsUpdate = true;
    }
  }, [leaves]);

  useFrame((state) => {
    if (!meshRef.current || quality === 'low' || leaves.length === 0) return;
    const t = state.clock.getElapsedTime();
    
    leaves.forEach((leaf, i) => {
        // Enhanced wind animation with individual sensitivity
        const windEffect = windFactor * leaf.windSensitivity;
        const turbulence = Math.sin(t * leaf.flutterSpeed + leaf.offset) * leaf.turbulence;
        
        // Position with turbulence
        const offsetY = leaf.position[1] + Math.sin(t * 0.5 * windEffect + leaf.offset) * (0.03 * windFactor) + turbulence * 0.02;
        const offsetX = Math.cos(t * 0.7 * windEffect + leaf.offset * 1.3) * turbulence * 0.015;
        const offsetZ = Math.sin(t * 0.9 * windEffect + leaf.offset * 0.7) * turbulence * 0.015;
        dummy.position.set(leaf.position[0] + offsetX, offsetY, leaf.position[2] + offsetZ);
        
        // Rotation with flutter
        const rotX = (leaf.rotX || 0) + Math.sin(t * 0.8 * windEffect + leaf.offset) * (0.08 * windFactor) + turbulence * 0.05;
        const rotY = (leaf.rotY || 0) + Math.cos(t * 0.6 * windEffect + leaf.offset * 1.1) * (0.04 * windFactor);
        const rotZ = (leaf.rotZ || 0) + Math.sin(t * 0.7 * windEffect + leaf.offset * 0.9) * (0.1 * windFactor) + turbulence * 0.06;
        dummy.rotation.set(rotX, rotY, rotZ);
        
        // Scale with slight breathing effect
        const s = leaf.scale * (1 + turbulence * 0.1);
        dummy.scale.set(s, s * 1.3, s * 0.25);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (leaves.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, leaves.length]} castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
      <sphereGeometry args={[0.5, segs, segs]} />
      <meshStandardMaterial 
        color="white" 
        roughness={0.75} 
      />
    </instancedMesh>
  );
};

// Structural Tree Branch with attached leaves
export const Branch = ({ position, yAngle, tilt, length, thickness, color, theme, leafCount, windFactor, quality = 'medium', detail = 'high', seed = 0, curveAmount = 0, curveDirection = 0, season = 'spring' }: { 
    position: [number, number, number], 
    yAngle: number,
    tilt: number,
    length: number,
    thickness: number,
    color: string,
    theme: any,
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

    useFrame((state) => {
        if (branchRef.current && quality !== 'low') {
            const t = state.clock.getElapsedTime();
            const sway = Math.sin(t * 0.6 + stableSeed) * (0.03 * windFactor);
            branchRef.current.rotation.x = tilt + sway;
            branchRef.current.rotation.z = Math.cos(t * 0.5 + stableSeed) * (0.02 * windFactor);
        }
    });

    // Generate leaf cluster at end of branch — spread along branch and at tip
    const branchLeaves = useMemo(() => {
        const pos = [];
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
        const leaves = [];
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
        const leaves = [];
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

export const TreeContent = ({ theme, scale = 1, leafCount, windFactor = 1, branchCount = 6, quality = 'medium', shake = false, detail = 'high', season = 'spring', treeHeight = 1 }: { theme: any; scale?: number; leafCount: number; windFactor?: number; branchCount?: number; quality?: string; shake?: boolean, detail?: 'high' | 'medium' | 'low', season?: 'spring' | 'summer' | 'autumn' | 'winter', treeHeight?: number }) => {
  const group = useRef<THREE.Group>(null);
  const [pulse, setPulse] = React.useState(1);
  const prevLeafCount = useRef(leafCount);

  const isLow = detail === 'low' || quality === 'low';
  const isMid = detail === 'medium';

  useFrame((state) => {
    if (group.current) {
        const t = state.clock.getElapsedTime();
        const breeze = Math.sin(t * 0.3) * 0.012 * windFactor;
        group.current.rotation.x = breeze;
        group.current.rotation.z = Math.cos(t * 0.25) * 0.008 * windFactor;
        
        if (shake) {
            group.current.rotation.x += Math.sin(t * 22) * 0.05;
            group.current.rotation.y += Math.sin(t * 28) * 0.02;
        }

        if (leafCount > prevLeafCount.current) {
            setPulse(1.1);
            prevLeafCount.current = leafCount;
        }
        if (pulse > 1) setPulse(prev => Math.max(1, prev - 0.01));
    }
  });

  function levelBasedBranchCount(leaves: number) {
      if (leaves < 50) return 6;
      if (leaves < 200) return 10;
      if (leaves < 500) return 16;
      return 22;
  }

  // Generate branches with proper tree-like distribution — evenly around trunk
  const branches = useMemo(() => {
      const b = [];
      const effectiveCount = Math.max(branchCount, levelBasedBranchCount(leafCount));
      
      for(let i = 0; i < effectiveCount; i++) {
          const goldenAngle = (i * 137.508 * Math.PI) / 180;
          const heightProgress = i / effectiveCount;
          // Branches start higher on trunk and go up (scaled by tree height)
          const height = (2.0 + heightProgress * 2.0) * treeHeight;
          
          // Trunk radius at this height (matching trunk geometry)
          let trunkR = 0.35;
          if (height < 1.0) trunkR = 0.55;
          else if (height < 1.5) trunkR = 0.42;
          else if (height < 2.0) trunkR = 0.32;
          else if (height < 2.5) trunkR = 0.22;
          else if (height < 3.0) trunkR = 0.14;
          else trunkR = 0.08;

          // Branch origin on trunk surface
          const bx = Math.cos(goldenAngle) * trunkR;
          const bz = Math.sin(goldenAngle) * trunkR;
          
          // 60 degree branch angles with upper branches longer
          const tiltFromVertical = 1.047; // Fixed 60 degrees (π/3 radians) for all branches
          const branchLength = (0.8 + heightProgress * 1.2) * (0.8 + seededRandom(i * 7.3) * 0.4); // Upper branches longer
          const branchThickness = 0.08 - heightProgress * 0.03; // Lower branches thicker
          
          b.push({
              position: [bx, height, bz] as [number, number, number],
              yAngle: goldenAngle + Math.PI / 2, // Point perpendicular to trunk surface
              tilt: tiltFromVertical + (seededRandom(i * 3.7) - 0.5) * 0.2,
              length: branchLength,
              thickness: branchThickness,
              seed: i * 42.7,
              curveAmount: seededRandom(i * 19.7) * 0.15, // Natural curve
              curveDirection: seededRandom(i * 23.1) * Math.PI * 2 // Curve direction
          });
      }
      return b;
  }, [branchCount, leafCount]);

  // Leaves per branch — very dense foliage for thick canopy
  const leavesPerBranch = useMemo(() => {
      const totalLeafBudget = quality === 'low' ? 1200 : (quality === 'medium' ? 2500 : 4000);
      return Math.max(50, Math.floor(totalLeafBudget / Math.max(branches.length, 1)));
  }, [branches.length, quality]);

  // Generate fruits based on leaf count
  const fruits = useMemo(() => {
    const count = Math.floor(leafCount / 100);
    return Array.from({ length: Math.min(count, 12) }).map((_, i) => {
        const angle = seededRandom(i * 5.3) * Math.PI * 2;
        const height = 2.0 + seededRandom(i * 7.1) * 2;
        const spread = 0.8 + seededRandom(i * 11.3) * 1.5;
        return {
            position: [Math.cos(angle) * spread, height, Math.sin(angle) * spread] as [number, number, number],
            color: i % 2 === 0 ? '#ff4d6d' : '#ff758f'
        };
    });
  }, [leafCount]);

  // Asymmetrical crown parameters
  const crownAsymmetry = useMemo(() => ({
    asymmetryX: seededRandom(137) * 0.3 - 0.15,
    asymmetryZ: seededRandom(251) * 0.3 - 0.15,
    crownLean: seededRandom(373) * 0.4 - 0.2
  }), []);

  // Crown foliage — organic asymmetrical masses
  const crownClusters = useMemo(() => {
    const clusters = [];
    const clusterCount = isLow ? 5 : (isMid ? 10 : 16);
    
    for (let i = 0; i < clusterCount; i++) {
      const r1 = seededRandom(i * 3.14);
      const r2 = seededRandom(i * 6.28);
      const r3 = seededRandom(i * 9.42);
      const r4 = seededRandom(i * 12.56);
      
      const angle = r1 * Math.PI * 2;
      const heightInCrown = r2;
      const crownY = 2.6 + heightInCrown * 2.4 + Math.sin(angle) * 0.3; // Varying heights
      
      // Asymmetrical radius with organic variation
      const baseRadius = 2.2 * (1 - heightInCrown * 0.4);
      const radiusVariation = (r3 - 0.5) * 0.6;
      const radius = 0.4 + (baseRadius + radiusVariation) * (1 + Math.abs(Math.sin(angle * 2)) * 0.3);
      
      // Add asymmetrical positioning
      const posX = Math.cos(angle) * radius + crownAsymmetry.asymmetryX * (1 - heightInCrown) + crownAsymmetry.crownLean * Math.cos(angle);
      const posZ = Math.sin(angle) * radius + crownAsymmetry.asymmetryZ * (1 - heightInCrown) + crownAsymmetry.crownLean * Math.sin(angle);
      
      clusters.push({
        position: [posX, crownY, posZ] as [number, number, number],
        scale: (0.6 + r1 * 0.7) * (1 - heightInCrown * 0.4) * (1 + r4 * 0.2),
        color: getSeasonalLeafColor(theme.leaves[i % theme.leaves.length], season),
      });
    }
    return clusters;
  }, [isLow, isMid, theme.leaves, crownAsymmetry, season]);

  // Crown-distributed leaves — dense canopy with concentrated clusters
  const crownLeaves = useMemo(() => {
    const leaves: any[] = [];
    const count = isLow ? 120 : (isMid ? 300 : 600);
    
    for (let i = 0; i < count; i++) {
      const r1 = seededRandom(i * 2.71 + 500);
      const r2 = seededRandom(i * 5.43 + 600);
      const r3 = seededRandom(i * 8.17 + 700);
      const r4 = seededRandom(i * 11.31 + 800);
      const r5 = seededRandom(i * 14.97 + 900);
      
      // Dense crown distribution with branch tip concentration (scaled by tree height)
      const heightT = r1;
      const crownY = (2.5 + heightT * 2.8) * treeHeight;
      const isBranchTip = r5 > 0.3;
      let maxR, distBias;
      
      if (isBranchTip) {
        // Concentrate around branch tip areas
        maxR = 0.8 + r3 * 0.4;
        distBias = 0.3 + r3 * 0.4;
      } else {
        // General canopy fill
        maxR = 1.8 * Math.sin(heightT * Math.PI) * (1 - heightT * 0.2);
        distBias = r3;
      }
      
      const angle = r2 * Math.PI * 2;
      const dist = distBias * maxR;
      
      leaves.push({
        position: [
          Math.cos(angle) * dist,
          crownY,
          Math.sin(angle) * dist
        ] as [number, number, number],
        scale: 0.12 + r1 * 0.18,
        color: getSeasonalLeafColor(theme.leaves[Math.floor(r2 * theme.leaves.length)], season),
        offset: r3 * Math.PI * 2,
        rotX: r4 * Math.PI * 2,
        rotY: r2 * Math.PI * 2,
        rotZ: r5 * Math.PI * 2,
        windSensitivity: 0.6 + seededRandom(i * 43.7) * 1.2,
        flutterSpeed: 0.9 + seededRandom(i * 47.1) * 1.1,
        turbulence: seededRandom(i * 31.9) * 0.25
      });
    }
    return leaves;
  }, [isLow, isMid, theme.leaves]);

  // Trunk segments — dramatic tapering with natural irregularities and configurable height
  const trunkSegments = useMemo(() => {
    const baseHeight = 4.85; // Original total height
    const heightScale = treeHeight;
    
    const segs = [
      // Even wider base with thinner trunk
      { topR: 0.30, botR: 0.55, h: 0.25 * heightScale, y: 0.125 * heightScale, rx: 0.03, rz: -0.02 },
      { topR: 0.29, botR: 0.30, h: 0.4 * heightScale, y: 0.5 * heightScale, rx: -0.02, rz: 0.01 },
      { topR: 0.28, botR: 0.29, h: 0.5 * heightScale, y: 0.9 * heightScale, rx: 0.02, rz: -0.03 },
      { topR: 0.27, botR: 0.28, h: 0.5 * heightScale, y: 1.4 * heightScale, rx: -0.01, rz: 0.02 },
      { topR: 0.26, botR: 0.27, h: 0.6 * heightScale, y: 1.9 * heightScale, rx: 0.01, rz: -0.01 },
      { topR: 0.25, botR: 0.26, h: 0.6 * heightScale, y: 2.5 * heightScale, rx: -0.02, rz: 0.01 },
      { topR: 0.24, botR: 0.25, h: 0.6 * heightScale, y: 3.1 * heightScale, rx: 0.02, rz: -0.02 },
      { topR: 0.23, botR: 0.24, h: 0.5 * heightScale, y: 3.7 * heightScale, rx: -0.01, rz: 0.01 },
      { topR: 0.22, botR: 0.23, h: 0.4 * heightScale, y: 4.15 * heightScale, rx: 0.01, rz: -0.01 },
      { topR: 0.21, botR: 0.22, h: 0.3 * heightScale, y: 4.55 * heightScale, rx: -0.01, rz: 0.02 },
    ];
    
    // Add natural irregularities without knots
    return segs.map((seg, i) => {
      const irregularity = seededRandom(i * 7.3);
      return {
        ...seg,
        topR: seg.topR * (0.92 + irregularity * 0.16),
        botR: seg.botR * (0.92 + (1 - irregularity) * 0.16),
        h: seg.h * (0.85 + seededRandom(i * 19.3) * 0.3),
        hasKnot: false, // No knots at all
        knotOffset: 0,
        knotSize: 0
      };
    });
  }, []);

  return (
    <group ref={group} scale={[scale * pulse, scale * pulse, scale * pulse]}>
        {/* === TRUNK === */}
        <group>
            {/* Main trunk segments with enhanced texture */}
            {trunkSegments.map((seg, i) => (
                <group key={`trunk-${i}`}>
                    {/* Main trunk cylinder */}
                    <mesh position={[0, seg.y, 0]} rotation={[seg.rx, 0, seg.rz]} castShadow receiveShadow>
                        <cylinderGeometry args={[seg.topR, seg.botR, seg.h, isLow ? 6 : 16]} />
                        <meshStandardMaterial 
                            color={theme.trunk} 
                            roughness={0.98}
                            metalness={0.05}
                        />
                    </mesh>
                    
                    {/* Enhanced bark texture with more variation */}
                    {!isLow && (
                        <>
                            {/* Primary bark ridges */}
                            <mesh position={[0, seg.y, 0]} rotation={[seg.rx + 0.15, 0, seg.rz + 0.12]} castShadow={false}>
                                <cylinderGeometry args={[seg.topR * 1.03, seg.botR * 1.03, seg.h * 0.7, 12]} />
                                <meshStandardMaterial color={theme.trunk} roughness={1} metalness={0} />
                            </mesh>
                            <mesh position={[0, seg.y, 0]} rotation={[seg.rx - 0.12, 0, seg.rz - 0.1]} castShadow={false}>
                                <cylinderGeometry args={[seg.topR * 1.02, seg.botR * 1.02, seg.h * 0.5, 8]} />
                                <meshStandardMaterial color={theme.trunk} roughness={1} metalness={0} />
                            </mesh>
                            {/* Secondary texture layer */}
                            <mesh position={[0, seg.y, 0]} rotation={[seg.rx + 0.08, 0, seg.rz - 0.08]} castShadow={false}>
                                <cylinderGeometry args={[seg.topR * 1.01, seg.botR * 1.01, seg.h * 0.4, 6]} />
                                <meshStandardMaterial color={theme.trunk} roughness={1} metalness={0} />
                            </mesh>
                        </>
                    )}
                </group>
            ))}
            
            {/* Roots spreading at base — attached to trunk surface */}
            {!isLow && Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2 + seededRandom(i * 2.7) * 0.4;
                const rLen = 0.8 + seededRandom(i * 4.1) * 0.6;
                const rootThickness = 0.08 + seededRandom(i * 11.3) * 0.12;
                const rootCurve = seededRandom(i * 7.9) * 0.3;
                // Start from trunk surface (radius 0.85 at base) and extend outward
                const trunkRadius = 0.85;
                return (
                    <group key={`root-${i}`} rotation={[0, angle, 0]}>
                        <mesh position={[trunkRadius, 0, 0]} rotation={[rootCurve, 0, Math.PI / 2.2 + rootCurve]} castShadow>
                            <cylinderGeometry args={[rootThickness * 0.3, rootThickness, rLen, 5]} />
                            <meshStandardMaterial color={theme.trunk} roughness={1} metalness={0} />
                        </mesh>
                    </group>
                );
            })}
        </group>

        {/* === BRANCHES WITH LEAVES === */}
        {branches.map((b, i) => (
            <Branch 
                key={i} 
                position={b.position}
                yAngle={b.yAngle}
                tilt={b.tilt}
                length={b.length}
                thickness={b.thickness}
                seed={b.seed}
                curveAmount={b.curveAmount}
                curveDirection={b.curveDirection}
                season={season}
                color={theme.trunk} 
                theme={theme} 
                leafCount={leavesPerBranch} 
                windFactor={windFactor}
                quality={quality}
                detail={detail}
            />
        ))}

        
        {/* === CROWN LEAVES — individual leaves filling the canopy === */}
        <InstancedLeaves leaves={crownLeaves} windFactor={windFactor} quality={isLow ? 'low' : quality} />


        {/* Heart Fruits */}
        {fruits.map((f, i) => (
            <Float key={`fruit-${i}`} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                <HeartFruit position={f.position} color={f.color} />
            </Float>
        ))}

        {/* Canopy ambient glow (scaled by tree height) */}
        {quality === 'high' && (
            <pointLight position={[0, 3.5 * treeHeight, 0]} distance={6 * treeHeight} intensity={0.4} color={theme.leaves[0]} />
        )}
        {quality === 'medium' && (
            <pointLight position={[0, 3.5 * treeHeight, 0]} distance={5 * treeHeight} intensity={0.3} color={theme.leaves[0]} />
        )}
    </group>
  );
};

// Seasonal leaf color adjustment
function getSeasonalLeafColor(baseColor: string, season: string): string {
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

export const Tree = (props: any) => {
    return (
        <group>
            <TreeContent {...props} detail="high" season={props.season || 'spring'} treeHeight={props.treeHeight || 1} />
        </group>
    );
};
