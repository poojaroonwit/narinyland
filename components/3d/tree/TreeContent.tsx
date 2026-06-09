"use client";

import * as React from 'react';
import { useRef, useMemo } from 'react';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { Branch } from './Branch';
import { HeartFruit } from './HeartFruit';
import { InstancedLeaves } from './InstancedLeaves';
import { LeafInstance, TreeContentProps, getSeasonalLeafColor, seededRandom } from './shared';
import { useGameLoop } from '../../game-engine-3d';

export const TreeContent = ({ theme, scale = 1, leafCount, windFactor = 1, branchCount = 6, quality = 'medium', shake = false, detail = 'high', season = 'spring', treeHeight = 1 }: TreeContentProps) => {
  const group = useRef<THREE.Group>(null);
  const [pulse, setPulse] = React.useState(1);
  const prevLeafCount = useRef(leafCount);

  const isLow = detail === 'low' || quality === 'low';
  const isMid = detail === 'medium';

  useGameLoop((state) => {
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
  }, [branchCount, leafCount, treeHeight]);

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
  void crownClusters;

  // Crown-distributed leaves — dense canopy with concentrated clusters
  const crownLeaves = useMemo(() => {
    const leaves: LeafInstance[] = [];
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
  }, [isLow, isMid, theme.leaves, season, treeHeight]);

  // Trunk segments — dramatic tapering with natural irregularities and configurable height
  const trunkSegments = useMemo(() => {
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
  }, [treeHeight]);

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
