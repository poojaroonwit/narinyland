"use client";

import * as React from 'react';
import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, Detailed, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Emotion } from '../../types';

export const PetVisuals = ({ petType, colors, emotion, active, quality, detail = 'high', coreRef, headRef, tailRef, legRefs }: any) => {
  const isLow = detail === 'low' || quality === 'low';
  const isMid = detail === 'medium';

  return (
    <group ref={coreRef}>
        {/* Body */}
        <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={!isLow}>
            <capsuleGeometry args={[0.25, 0.45, isLow ? 2 : 4, isLow ? 4 : 8]} />
            <meshStandardMaterial color={colors.primary} />
        </mesh>
        
        {/* Underbelly Patch - Simple on Mid/Low */}
        {!isLow && (
            <mesh position={[0, 0.38, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.2, 0.4, 3, isMid ? 4 : 8]} />
                <meshStandardMaterial color={colors.secondary} transparent opacity={petType === 'panda' ? 1 : 0.6} />
            </mesh>
        )}

        {/* Head */}
        <group ref={headRef} position={[0, 0.7, 0.35]}>
            <mesh castShadow={!isLow}>
                <sphereGeometry args={[0.28, isLow ? 6 : (isMid ? 10 : 16), isLow ? 6 : (isMid ? 10 : 16)]} />
                <meshStandardMaterial color={colors.primary} />
            </mesh>
            
            {/* Face Patch - Skip on Low */}
            {!isLow && (
                <mesh position={[0, -0.05, 0.1]} scale={[1, 0.8, 1]}>
                    <sphereGeometry args={[0.22, isMid ? 6 : 12, isMid ? 6 : 12]} />
                    <meshStandardMaterial color={colors.secondary} />
                </mesh>
            )}
            
            {/* Snout - Simplified on Mid, Removed on Low */}
            {!isLow && (
                <group position={[0, -0.05, 0.25]}>
                    <mesh castShadow={detail === 'high'}>
                        <boxGeometry args={[petType === 'rabbit' ? 0.1 : 0.15, 0.12, 0.15]} />
                        <meshStandardMaterial color={colors.secondary} />
                    </mesh>
                    {!isMid && (
                        <mesh position={[0, 0.04, 0.08]}>
                            <sphereGeometry args={[petType === 'rabbit' ? 0.02 : 0.03, 5, 5]} />
                            <meshStandardMaterial color={colors.nose} />
                        </mesh>
                    )}
                </group>
            )}

            {/* Eyes - Simple spheres on Mid, Skip on Low */}
            {!isLow && (
                <>
                    <mesh position={[0.12, 0.08, 0.2]}>
                        <sphereGeometry args={[0.035, 4, 4]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    <mesh position={[-0.12, 0.08, 0.2]}>
                        <sphereGeometry args={[0.035, 4, 4]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                </>
            )}

            {/* Ears - Simple shapes */}
            {petType === 'rabbit' ? (
                <>
                <mesh position={[0.1, 0.4, 0]} rotation={[0.1, 0, 0]}>
                    <capsuleGeometry args={[0.05, 0.4, 2, isLow ? 4 : 8]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                <mesh position={[-0.1, 0.4, 0]} rotation={[0.1, 0, 0]}>
                    <capsuleGeometry args={[0.05, 0.4, 2, isLow ? 4 : 8]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                </>
            ) : petType === 'panda' ? (
                <>
                <mesh position={[0.2, 0.25, 0.1]} rotation={[0, 0, 0]}>
                    <sphereGeometry args={[0.1, isLow ? 4 : 8, isLow ? 4 : 8]} />
                    <meshStandardMaterial color={colors.secondary} />
                </mesh>
                <mesh position={[-0.2, 0.25, 0.1]} rotation={[0, 0, 0]}>
                    <sphereGeometry args={[0.1, isLow ? 4 : 8, isLow ? 4 : 8]} />
                    <meshStandardMaterial color={colors.secondary} />
                </mesh>
                </>
            ) : (
                <>
                <mesh position={[0.18, 0.22, 0.1]} rotation={[0.2, 0, -0.3]}>
                    <coneGeometry args={[0.08, 0.2, isLow ? 3 : 4]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                <mesh position={[-0.18, 0.22, 0.1]} rotation={[0.2, 0, 0.3]}>
                    <coneGeometry args={[0.08, 0.2, isLow ? 3 : 4]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
                </>
            )}

            {/* Blush */}
            {(emotion === 'happy' || emotion === 'excited') && !isLow && (
                <>
                    <mesh position={[0.18, -0.05, 0.15]}>
                        <circleGeometry args={[0.06, 8]} />
                        <meshStandardMaterial color="#fda4af" transparent opacity={0.5} />
                    </mesh>
                    <mesh position={[-0.18, -0.05, 0.15]}>
                        <circleGeometry args={[0.06, 8]} />
                        <meshStandardMaterial color="#fda4af" transparent opacity={0.5} />
                    </mesh>
                </>
            )}
        </group>

        {/* Tail */}
        <group ref={tailRef} position={[0, 0.6, -0.45]} rotation={[-0.5, 0, 0]}>
            {petType === 'rabbit' ? (
                <mesh castShadow={detail === 'high'}>
                    <sphereGeometry args={[0.1, 4, 4]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
            ) : petType === 'fox' ? (
                <mesh castShadow={detail === 'high'} rotation={[Math.PI/2, 0, 0]} position={[0, -0.2, -0.2]}>
                    <capsuleGeometry args={[0.12, 0.4, 2, isLow ? 4 : 6]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
            ) : (
                <mesh castShadow={detail === 'high'}>
                    <torusGeometry args={[0.12, 0.05, 4, isLow ? 6 : 12, Math.PI * 1.5]} />
                    <meshStandardMaterial color={colors.primary} />
                </mesh>
            )}
            {!isLow && (
                <mesh position={[0, 0.1, 0]}>
                    <sphereGeometry args={[0.07, 4, 4]} />
                    <meshStandardMaterial color={colors.secondary} />
                </mesh>
            )}
        </group>

        {/* Legs */}
        {[
            { p: [0.15, 0.25, 0.2], r: legRefs[0] }, 
            { p: [-0.15, 0.25, 0.2], r: legRefs[1] }, 
            { p: [0.15, 0.25, -0.2], r: legRefs[2] }, 
            { p: [-0.15, 0.25, -0.2], r: legRefs[3] }  
        ].map((leg: any, i) => (
            <group key={i} position={leg.p} ref={leg.r} scale={petType === 'panda' ? [1.2, 1, 1.2] : [1, 1, 1]}>
                <mesh position={[0, -0.15, 0]} castShadow={detail === 'high'}>
                    <boxGeometry args={[0.08, 0.3, 0.08]} />
                    <meshStandardMaterial color={petType === 'panda' ? colors.secondary : colors.primary} />
                </mesh>
                {!isLow && (
                    <mesh position={[0, -0.3, 0.02]}>
                        <boxGeometry args={[0.09, 0.05, 0.12]} />
                        <meshStandardMaterial color={colors.secondary} />
                    </mesh>
                )}
            </group>
        ))}

        {/* Emotion Particles - Only on high */}
        {detail === 'high' && (
            <>
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
            </>
        )}
    </group>
  );
};

export const Pet3D = React.forwardRef<THREE.Group, { emotion: Emotion; theme: any; petType?: string; startPos?: [number, number, number]; otherPets?: Array<{ ref: React.RefObject<THREE.Group | null>, type: string }>; quality?: string }>(({ emotion, theme, petType = 'cat', startPos = [2, 0, 2], otherPets = [], quality = 'medium' }, externalRef) => {
  const innerRef = useRef<THREE.Group>(null);
  const ref = (externalRef as React.RefObject<THREE.Group>) || innerRef;
  
  const coreRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const legRefs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  
  const [active, setActive] = useState(false);
  
  const colors = useMemo(() => {
    switch(petType) {
      case 'cat': return { primary: "#555", secondary: "#fff", nose: "#ff99ad" };
      case 'dog': return { primary: "#e69138", secondary: "#fff", nose: "#222" };
      case 'rabbit': return { primary: "#fff", secondary: "#f9a8d4", nose: "#f472b6" };
      case 'panda': return { primary: "#ffffff", secondary: "#000000", nose: "#000" };
      case 'fox': return { primary: "#f97316", secondary: "#fff", nose: "#222" };
      default: return { primary: "#e69138", secondary: "#fff", nose: "#222" };
    }
  }, [petType]);

  const [activity, setActivity] = useState<'walk' | 'sit' | 'lie' | 'idle' | 'play'>('idle');
  const activityTimer = useRef(0);
  const targetPos = useRef(new THREE.Vector3(startPos[0], startPos[1], startPos[2]));

  // Jump Physics State
  const isJumping = useRef(false);
  const jumpVelocity = useRef(0);
  const jumpHeight = useRef(0);
  const spinSpeed = useRef(0);

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
                const states: typeof activity[] = ['walk', 'idle', 'sit', 'lie', 'play'];
                const weights = [0.4, 0.2, 0.1, 0.1, 0.2];
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
            
            if (activity === 'walk' || activity === 'play') {
                const angle = Math.random() * Math.PI * 2;
                const dist = activity === 'play' ? 1.0 + Math.random() * 2.0 : 1.5 + Math.random() * 4.5;
                
                let finalTarget = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
                if (activity === 'play' && otherPets.length > 0) {
                    const companion = otherPets[Math.floor(Math.random() * otherPets.length)];
                    if (companion.ref.current) {
                        const companionPos = companion.ref.current.position;
                        finalTarget.set(companionPos.x + (Math.random() - 0.5) * 2, 0, companionPos.z + (Math.random() - 0.5) * 2);
                    }
                }
                targetPos.current.copy(finalTarget);
            }
        }

        const head = headRef.current;
        
        // 2. Natural Animation Procedural Lerping
        let targetY = 0;
        let targetBodyRot = 0;
        let legRotX = [0, 0, 0, 0]; 
        let legRotZ = [0, 0, 0, 0];

        switch(activity) {
            case 'walk':
                ref.current.position.lerp(targetPos.current, 0.02);
                const dir = targetPos.current.clone().sub(ref.current.position).normalize();
                if (dir.lengthSq() > 0.001) {
                    const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
                    ref.current.quaternion.slerp(targetQuat, 0.1);
                }
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
                targetBodyRot = -Math.PI / 10;
                legRotX = [0, 0, -1.2, -1.2];
                if (head) {
                    head.rotation.x = -0.1 + Math.sin(t * 0.5) * 0.2;
                    head.rotation.y = Math.sin(t * 0.3) * 0.4;
                }
                break;

            case 'lie':
                targetY = -0.3;
                targetBodyRot = 0;
                legRotX = [-Math.PI / 2.2, -Math.PI / 2.2, -Math.PI / 2.2, -Math.PI / 2.2];
                if (head) {
                    head.rotation.x = 0.2;
                    head.rotation.y = Math.sin(t * 0.2) * 0.1;
                }
                break;

            case 'play':
                ref.current.position.lerp(targetPos.current, 0.04);
                const pDir = targetPos.current.clone().sub(ref.current.position).normalize();
                if (pDir.lengthSq() > 0.001) {
                    const tQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pDir);
                    ref.current.quaternion.slerp(tQuat, 0.2);
                }
                targetY = 0.2 + Math.abs(Math.sin(t * 15)) * 0.4;
                legRotX = [
                    Math.sin(t * 20) * 0.8,
                    Math.sin(t * 20 + Math.PI) * 0.8,
                    Math.sin(t * 20 + Math.PI) * 0.8,
                    Math.sin(t * 20) * 0.8
                ];
                if (head) head.rotation.z = Math.sin(t * 10) * 0.2;
                break;

            default: 
                targetY = Math.sin(t * 2) * 0.02;
                if (head) {
                    head.rotation.x = Math.sin(t * 1) * 0.1;
                    head.rotation.y = Math.sin(t * 0.5) * 0.3;
                }
                break;
        }

        coreRef.current.position.y = THREE.MathUtils.lerp(coreRef.current.position.y, targetY, 0.1);
        coreRef.current.rotation.x = THREE.MathUtils.lerp(coreRef.current.rotation.x, targetBodyRot, 0.1);
        
        if (headRef.current) {
            let headX = 0;
            let headY = 0;
            if (activity === 'walk') {
               headX = Math.sin(t * 10) * 0.1;
            } else {
               const cameraPos = state.camera.position.clone();
               const localLook = headRef.current.parent!.worldToLocal(cameraPos);
               headY = Math.atan2(localLook.x, localLook.z);
               headX = -Math.atan2(localLook.y, Math.sqrt(localLook.x * localLook.x + localLook.z * localLook.z));
               headY = THREE.MathUtils.clamp(headY, -Math.PI / 2.5, Math.PI / 2.5);
               headX = THREE.MathUtils.clamp(headX, -Math.PI / 4, Math.PI / 6);
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

        if (tailRef.current) {
            const wagSpeed = (activity === 'walk' || emotion === 'excited') ? 15 : 2;
            tailRef.current.rotation.z = (Math.PI / 8) + Math.sin(t * wagSpeed) * 0.2;
        }

        if (isJumping.current) {
            jumpVelocity.current -= delta * 15; 
            jumpHeight.current += jumpVelocity.current * delta;
            
            if (coreRef.current) coreRef.current.rotation.y += spinSpeed.current * delta;

            if (jumpHeight.current <= 0) {
                jumpHeight.current = 0;
                isJumping.current = false;
                if (ref.current) ref.current.scale.set(1.2, 0.8, 1.2);
            }
            if (coreRef.current) coreRef.current.position.y = Math.max(0, coreRef.current.position.y + jumpHeight.current);
        }

        if (ref.current) ref.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  const handlePetClick = (e: any) => {
    e.stopPropagation();
    if (!isJumping.current) {
        isJumping.current = true;
        jumpVelocity.current = 6.0;
        spinSpeed.current = Math.random() > 0.5 ? 10 : -10;
        if (ref.current) ref.current.scale.set(1.2, 0.8, 1.2);
        setActive(true);
        setTimeout(() => setActive(false), 500);
    }
  };

  const visualsProps = { petType, colors, emotion, active, quality, coreRef, headRef, tailRef, legRefs };

  return (
    <group ref={ref} position={startPos} onClick={handlePetClick}>
        <Detailed distances={[0, 10, 20]}>
            <PetVisuals {...visualsProps} detail="high" />
            <PetVisuals {...visualsProps} detail="medium" />
            <PetVisuals {...visualsProps} detail="low" />
        </Detailed>
    </group>
  );
});

Pet3D.displayName = 'Pet3D';
