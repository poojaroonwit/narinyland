"use client";

import React, { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HEX_VISUAL_THEME } from '@/lib/hex-world/visual-theme';

const palette = HEX_VISUAL_THEME.explore.character;

export const HexPlayerAvatar = forwardRef<THREE.Group, {
  moving: boolean;
  reducedMotion: boolean;
}>(function HexPlayerAvatar({ moving, reducedMotion }, ref) {
  const motionRootRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const motionRoot = motionRootRef.current;
    const torso = torsoRef.current;
    const leftArm = leftArmRef.current;
    const rightArm = rightArmRef.current;
    const leftLeg = leftLegRef.current;
    const rightLeg = rightLegRef.current;
    const head = headRef.current;
    if (!motionRoot || !torso || !leftArm || !rightArm || !leftLeg || !rightLeg || !head) return;

    const time = clock.elapsedTime;
    const walkPhase = time * 7.2;
    const stride = moving ? Math.sin(walkPhase) : 0;
    const lift = moving ? Math.max(0, Math.sin(walkPhase * 2)) : 0;
    const decorativeScale = reducedMotion ? 0 : 1;

    leftArm.rotation.x = stride * 0.62;
    rightArm.rotation.x = -stride * 0.62;
    leftLeg.rotation.x = -stride * 0.48;
    rightLeg.rotation.x = stride * 0.48;
    torso.rotation.z = moving ? -stride * 0.025 * decorativeScale : Math.sin(time * 1.35) * 0.012 * decorativeScale;
    torso.rotation.x = moving ? 0.025 : Math.sin(time * 1.15) * 0.008 * decorativeScale;
    head.rotation.z = moving ? stride * 0.012 * decorativeScale : Math.sin(time * 0.9) * 0.01 * decorativeScale;
    motionRoot.position.y = moving ? lift * 0.014 * decorativeScale : Math.sin(time * 1.4) * 0.008 * decorativeScale;
  });

  return (
    <group ref={ref} scale={0.88}>
      <group ref={motionRootRef}>
        <group ref={leftLegRef} position={[-0.105, 0.43, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            <capsuleGeometry args={[0.066, 0.25, 5, 7]} />
            <meshStandardMaterial color={palette.trousers} roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.37, 0.055]} castShadow>
            <boxGeometry args={[0.15, 0.12, 0.29]} />
            <meshStandardMaterial color={palette.leatherDark} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.29, 0]} castShadow>
            <cylinderGeometry args={[0.078, 0.072, 0.15, 7]} />
            <meshStandardMaterial color={palette.leather} roughness={0.94} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.105, 0.43, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow>
            <capsuleGeometry args={[0.066, 0.25, 5, 7]} />
            <meshStandardMaterial color={palette.trousers} roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.37, 0.055]} castShadow>
            <boxGeometry args={[0.15, 0.12, 0.29]} />
            <meshStandardMaterial color={palette.leatherDark} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.29, 0]} castShadow>
            <cylinderGeometry args={[0.078, 0.072, 0.15, 7]} />
            <meshStandardMaterial color={palette.leather} roughness={0.94} />
          </mesh>
        </group>

        <group ref={torsoRef} position={[0, 0.72, 0]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.2, 0.32, 6, 9]} />
            <meshStandardMaterial color={palette.tunic} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.075, 0.185]} scale={[0.86, 0.52, 0.3]} castShadow>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshStandardMaterial color={palette.tunicLight} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.17, 0.005]} castShadow>
            <boxGeometry args={[0.44, 0.075, 0.28]} />
            <meshStandardMaterial color={palette.leatherDark} roughness={0.92} />
          </mesh>
          <mesh position={[0, -0.17, 0.155]} castShadow>
            <boxGeometry args={[0.085, 0.085, 0.045]} />
            <meshStandardMaterial color={palette.metal} metalness={0.15} roughness={0.6} />
          </mesh>

          <group name="scarf-collar" position={[0, 0.205, 0.015]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.175, 0.045, 6, 10]} />
              <meshStandardMaterial color={palette.scarf} roughness={0.88} />
            </mesh>
            <mesh position={[0.12, -0.105, 0.115]} rotation={[0.08, 0.15, -0.16]} castShadow>
              <boxGeometry args={[0.105, 0.27, 0.035]} />
              <meshStandardMaterial color={palette.scarf} roughness={0.9} />
            </mesh>
          </group>

          <group name="backpack" position={[0, 0.015, -0.22]}>
            <mesh castShadow>
              <boxGeometry args={[0.34, 0.39, 0.19]} />
              <meshStandardMaterial color={palette.leather} roughness={0.94} />
            </mesh>
            <mesh position={[0, 0.03, -0.105]} castShadow>
              <boxGeometry args={[0.29, 0.22, 0.055]} />
              <meshStandardMaterial color={palette.leatherDark} roughness={0.94} />
            </mesh>
            <mesh position={[0, 0.15, 0.105]}>
              <boxGeometry args={[0.22, 0.035, 0.035]} />
              <meshStandardMaterial color={palette.metal} roughness={0.65} />
            </mesh>
          </group>
          <group name="pouch" position={[0.255, -0.17, -0.02]}>
            <mesh castShadow><boxGeometry args={[0.13, 0.17, 0.12]} /><meshStandardMaterial color={palette.leather} roughness={0.94} /></mesh>
          </group>
        </group>

        <group ref={leftArmRef} position={[-0.275, 0.88, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.22, 5, 7]} />
            <meshStandardMaterial color={palette.shirt} roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.33, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.16, 5, 7]} />
            <meshStandardMaterial color={palette.skin} roughness={1} />
          </mesh>
          <mesh position={[0, -0.45, 0]} castShadow><sphereGeometry args={[0.06, 7, 6]} /><meshStandardMaterial color={palette.skin} roughness={1} /></mesh>
        </group>
        <group ref={rightArmRef} position={[0.275, 0.88, 0]}>
          <mesh position={[0, -0.15, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.22, 5, 7]} />
            <meshStandardMaterial color={palette.shirt} roughness={0.96} />
          </mesh>
          <mesh position={[0, -0.33, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.16, 5, 7]} />
            <meshStandardMaterial color={palette.skin} roughness={1} />
          </mesh>
          <mesh position={[0, -0.45, 0]} castShadow><sphereGeometry args={[0.06, 7, 6]} /><meshStandardMaterial color={palette.skin} roughness={1} /></mesh>
        </group>

        <group ref={headRef} position={[0, 1.12, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.205, 12, 10]} />
            <meshStandardMaterial color={palette.skin} roughness={1} />
          </mesh>
          <group name="hair">
            <mesh position={[0, 0.105, -0.025]} scale={[1.03, 0.74, 1]} castShadow>
              <sphereGeometry args={[0.212, 10, 8]} />
              <meshStandardMaterial color={palette.hair} roughness={0.96} />
            </mesh>
            <mesh position={[-0.13, 0.04, 0.105]} rotation={[0.18, 0.2, 0.26]} castShadow><coneGeometry args={[0.075, 0.24, 6]} /><meshStandardMaterial color={palette.hairLight} roughness={0.96} /></mesh>
            <mesh position={[0.12, 0.055, 0.11]} rotation={[0.2, -0.18, -0.2]} castShadow><coneGeometry args={[0.07, 0.22, 6]} /><meshStandardMaterial color={palette.hair} roughness={0.96} /></mesh>
            <mesh position={[0.02, 0.1, 0.15]} rotation={[0.45, 0, 0.04]} castShadow><coneGeometry args={[0.06, 0.2, 6]} /><meshStandardMaterial color={palette.hairLight} roughness={0.96} /></mesh>
          </group>
          <mesh position={[-0.075, -0.015, 0.185]}><sphereGeometry args={[0.017, 6, 5]} /><meshStandardMaterial color="#302925" roughness={1} /></mesh>
          <mesh position={[0.075, -0.015, 0.185]}><sphereGeometry args={[0.017, 6, 5]} /><meshStandardMaterial color="#302925" roughness={1} /></mesh>
        </group>
      </group>
    </group>
  );
});
