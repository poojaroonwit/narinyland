"use client"; 

import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Sky, Stars, Sparkles, SoftShadows, DragControls, Grid } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import Shop, { ShopItem } from './Shop';

import { Emotion, PurchasedItem } from '../types';
import { THEMES } from './3d/GardenConstants';
import { Pet3D } from './3d/Pet';
import { Tree } from './3d/Tree';
import { Flower } from './3d/Flower';
import { Terrain, Grass, Pond, StonePath, GardenProp } from './3d/GardenProps';
import { Butterfly, Bird, FallingLeaf, FloatingText, Fireflies, FallingPetals, LeafExplosion, Clouds, ShootingStar, GodRays, Nebula, Aurora, SkyDome, HorizonGlow, CirrusClouds, MilkyWay, SkyColorBands } from './3d/Environment';

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
  points?: number;
  onAddLeaf: () => void;
  skyMode?: string;
  showQRCode?: boolean;
  petType?: string;
  pets?: Array<{ id: string; type: string; name?: string }>;
  albums?: Array<{ id: string; name: string }>;
  graphicsQuality?: 'low' | 'medium' | 'high';
  purchasedItems?: PurchasedItem[];
  onUpdateItemPosition?: (id: string, x: number, y: number, z: number) => void;
  activeLandId?: string;
  onPurchase?: (item: ShopItem) => Promise<void>;
  isEditMode?: boolean;
  setIsEditMode?: (val: boolean) => void;
}

const DraggableItem = ({ item, onUpdate, children }: { item: PurchasedItem, onUpdate?: (id: string, x: number, y: number, z: number) => void, children: React.ReactNode }) => {
  const [position, setPosition] = useState<[number, number, number]>([item.x || 0, item.y || 0, item.z || 0]);
  const groupRef = useRef<THREE.Group>(null);
  
  return (
    <DragControls 
      autoTransform={true} 
      dragLimits={[[-20, 20], [0, 0], [-20, 20]]} 
      onDragEnd={() => {
        if (groupRef.current) {
           const p = groupRef.current.position;
           setPosition([p.x, 0, p.z]); // restrict to floor
           if (onUpdate) onUpdate(item.id, p.x, 0, p.z);
        }
      }}
    >
      <group ref={groupRef} position={position}>
        {children}
      </group>
    </DragControls>
  );
};

const CustomGLTFModel = ({ url, scale = 1 }: { url: string, scale?: number }) => {
  const { useGLTF } = require('@react-three/drei');
  const { scene } = useGLTF(url);
  // Clone the scene so multiple of the same model can be rendered
  const clone = useMemo(() => scene.clone(), [scene]);
  return <primitive object={clone} scale={scale} />;
};

// Spawn-in animation: objects start from a glowing sphere and scale in with spring bounce
const SpawnIn = ({ children, delay = 0, position = [0, 0, 0] as [number, number, number] }: { children: React.ReactNode, delay?: number, position?: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const DURATION = 0.65;
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (startTime.current === null) {
      if (t < delay) {
        if (groupRef.current) groupRef.current.scale.setScalar(0);
        if (sphereRef.current) sphereRef.current.scale.setScalar(0);
        return;
      }
      startTime.current = t;
    }

    if (startTime.current === null) return;
    const elapsed = t - startTime.current;
    const p = Math.min(elapsed / DURATION, 1);

    // Elastic spring overshoot easing
    const spring = p === 1
      ? 1
      : 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3);

    if (groupRef.current) groupRef.current.scale.setScalar(Math.max(0, spring));

    // Glowing sphere: pulse in then shrink away as object appears
    if (sphereRef.current) {
      const sScale = p < 0.25 ? (p / 0.25) : Math.max(0, 1 - (p - 0.25) / 0.35);
      sphereRef.current.scale.setScalar(sScale * 0.6);
    }
  });

  return (
    <group position={position}>
      <mesh ref={sphereRef} scale={0}>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshBasicMaterial color="#ec4899" transparent opacity={0.55} />
      </mesh>
      <group ref={groupRef} scale={[0, 0, 0]}>
        {children}
      </group>
    </group>
  );
};

const LoveTree3D: React.FC<LoveTree3DProps> = ({ 
    anniversaryDate, treeStyle = 'oak', petEmotion, petMessage, level,
     leaves, points = 0, onAddLeaf, daysPerFlower = 7, flowerType = 'sunflower',
     mixedFlowers = ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'],
     skyMode = 'follow_timezone', showQRCode = false, petType = 'cat',
     pets = [], albums = [],
     graphicsQuality = 'medium',
     purchasedItems = [], onUpdateItemPosition,
     activeLandId, onPurchase,
     isEditMode = false, setIsEditMode
 }) => {
   const [isShopPopoverOpen, setIsShopPopoverOpen] = useState(false);
   const theme = THEMES[treeStyle] || THEMES['oak'];
   const [isQRUploadOpen, setIsQRUploadOpen] = useState(false);
   const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
   const [showExplosion, setShowExplosion] = useState(false);
   const [shakeTree, setShakeTree] = useState(false);
   const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; position: [number, number, number]; color: string }>>([]);
   const prevLeafCount = useRef(leaves);

   // Trigger explosion and floating text logic
   React.useEffect(() => {
     if (leaves > prevLeafCount.current) {
        setShowExplosion(true);
        const t = setTimeout(() => setShowExplosion(false), 2000);
        
        // Add floating text
        const id = Date.now();
        const randomX = (Math.random() - 0.5) * 3;
        const randomZ = (Math.random() - 0.5) * 3;
        const height = 4 + Math.random() * 2;
        
        setFloatingTexts(prev => [
            ...prev, 
            { id, text: "+1 🍃", position: [randomX, height, randomZ], color: theme.leaves[1] }
        ]);

        // Cleanup text after 2 seconds
        setTimeout(() => {
            setFloatingTexts(prev => prev.filter(item => item.id !== id));
        }, 2000);

        prevLeafCount.current = leaves;
        return () => clearTimeout(t);
     }
     prevLeafCount.current = leaves;
   }, [leaves, theme]);

   // Calculate Growth Stage
   const { growthScale, branchCount } = useMemo(() => {
      let scale = 1;
      let branchCount = 6;
      
      if (leaves < 50) {
          // Stage 1: Sapling
          const progress = Math.max(0, leaves / 50);
          scale = 0.8 + (progress * 0.2); // 0.8 -> 1.0
          branchCount = 6;
      } else if (leaves < 100) {
          // Stage 2: Young Tree
          const progress = (leaves - 50) / 50;
          scale = 1.0 + (progress * 0.2); // 1.0 -> 1.2
          branchCount = 6 + Math.floor(progress * 4); // 6 -> 10
      } else {
          // Stage 3: Mature Tree
          const progress = Math.min((leaves - 100) / 900, 1);
          scale = 1.2 + (progress * 0.8); // 1.2 -> 2.0
          branchCount = 10 + Math.floor(progress * 10); // 10 -> 20
      }
      return { growthScale: scale, branchCount };
  }, [leaves]);

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
    const maxFlowers = graphicsQuality === 'high' ? 150 : (graphicsQuality === 'medium' ? 80 : 30);
    const count = Math.min(flowerCount, maxFlowers); 
    const activeFlowers = (mixedFlowers && mixedFlowers.length > 0) 
      ? mixedFlowers 
      : ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'];

    for(let i=0; i<count; i++) {
        const sin1 = Math.sin(i * 123.456) * 10000;
        const r1 = sin1 - Math.floor(sin1);
        const sin2 = Math.sin(i * 789.012) * 10000;
        const r2 = sin2 - Math.floor(sin2);
        const sin3 = Math.sin(i * 456.789) * 10000;
        const r3 = sin3 - Math.floor(sin3);

        const angle = i * 137.5 + (r1 - 0.5) * 45; 
        const radius = 2.8 + Math.sqrt(i) * 0.7 + (r2 - 0.5) * 1.8;
        
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const z = Math.sin(angle * Math.PI / 180) * radius;
        
        const s = 0.7 + r3 * 0.6;
        const t = flowerType === 'mixed' ? activeFlowers[Math.floor(r1 * activeFlowers.length)] : flowerType;
        
        pos.push({ x, z, type: t, scale: s });
    }
    return pos;
  }, [flowerCount, flowerType, mixedFlowers, graphicsQuality]);
  
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

   // Sync with device time or fixed time based on skyMode
   const [isMounted, setIsMounted] = useState(false);
   const [currentHour, setCurrentHour] = useState(12); // Default to noon for SSR

   React.useEffect(() => {
     setIsMounted(true);
     const updateTime = () => {
       if (skyMode === 'follow_timezone') {
         const now = new Date();
         setCurrentHour(now.getHours() + now.getMinutes() / 60);
       } else {
         setCurrentHour(skyMode === 'noon' ? 12 : 23);
       }
     };

     updateTime();
     const timer = setInterval(updateTime, 60000); // Update every minute
     return () => clearInterval(timer);
   }, [skyMode]);

   const hour = currentHour;
  
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

    const skyColor = useMemo(() => {
        // Special themes override sky
        if (['neon', 'midnight'].includes(treeStyle)) return theme.bg;
        
        // Realistic sky colors based on atmospheric scattering
        // Deep Night (20:00 - 5:00) — dark navy with subtle blue
        if (hour >= 21 || hour < 4.5) return '#08101f';
        
        // Night -> Pre-dawn (4:30 - 5:30) — very subtle warm on horizon
        if (hour >= 4.5 && hour < 5.5) {
            const t = (hour - 4.5) / 1.0;
            return new THREE.Color('#08101f').lerp(new THREE.Color('#1a1a2e'), t).getStyle();
        }
        
        // Dawn twilight (5:30 - 6:15) — deep blue to warm peach
        if (hour >= 5.5 && hour < 6.25) {
            const t = (hour - 5.5) / 0.75;
            return new THREE.Color('#1a1a2e').lerp(new THREE.Color('#c9a87c'), t).getStyle();
        }
        
        // Sunrise (6:15 - 7:30) — warm golden peach to soft blue
        if (hour >= 6.25 && hour < 7.5) {
            const t = (hour - 6.25) / 1.25;
            return new THREE.Color('#c9a87c').lerp(new THREE.Color('#7db8d4'), t).getStyle();
        }
        
        // Morning (7:30 - 10:00) — soft blue warming up
        if (hour >= 7.5 && hour < 10) {
            const t = (hour - 7.5) / 2.5;
            return new THREE.Color('#7db8d4').lerp(new THREE.Color('#5b9fd4'), t).getStyle();
        }
        
        // Midday (10:00 - 15:00) — clear sky blue
        if (hour >= 10 && hour < 15) return '#5b9fd4';
        
        // Afternoon (15:00 - 17:00) — sky starts warming
        if (hour >= 15 && hour < 17) {
            const t = (hour - 15) / 2.0;
            return new THREE.Color('#5b9fd4').lerp(new THREE.Color('#8fb4c9'), t).getStyle();
        }
        
        // Golden hour (17:00 - 18:30) — warm amber sky
        if (hour >= 17 && hour < 18.5) {
            const t = (hour - 17) / 1.5;
            return new THREE.Color('#8fb4c9').lerp(new THREE.Color('#d4845a'), t).getStyle();
        }
        
        // Sunset (18:30 - 19:30) — deep orange to purple
        if (hour >= 18.5 && hour < 19.5) {
            const t = (hour - 18.5) / 1.0;
            return new THREE.Color('#d4845a').lerp(new THREE.Color('#2d1b4e'), t).getStyle();
        }
        
        // Dusk (19:30 - 20:00) — purple to deep navy
        if (hour >= 19.5 && hour < 20) {
            const t = (hour - 19.5) / 0.5;
            return new THREE.Color('#2d1b4e').lerp(new THREE.Color('#111827'), t).getStyle();
        }
        
        // Late dusk (20:00 - 21:00) — settling into night
        if (hour >= 20 && hour < 21) {
            const t = (hour - 20) / 1.0;
            return new THREE.Color('#111827').lerp(new THREE.Color('#08101f'), t).getStyle();
        }
        
        return '#5b9fd4';
    }, [hour, treeStyle, theme.bg]);

   const sunPosition = useMemo(() => {
     const isNight = hour < 5.5 || hour >= 19.5;
     if (isNight) return [0, -100, -100] as [number, number, number];
     
     const t = (hour - 5.5) / 14; 
     const angle = t * Math.PI;
     const posX = Math.cos(Math.PI - angle) * 110;
     const posY = Math.sin(angle) * 75;
     const posZ = Math.cos(angle) * 30;
     return [posX, posY, posZ] as [number, number, number];
   }, [hour]);
  
  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const isMobile = window.innerWidth < 768;
    const base = window.devicePixelRatio || 1;
    if (graphicsQuality === 'low') return Math.min(0.8, base);
    if (graphicsQuality === 'medium') return Math.min(1.0, base);
    return isMobile ? Math.min(1.5, base) : Math.min(2, base);
  }, [graphicsQuality]);

   if (!isMounted) return (
     <div className="fixed inset-0 -z-10 bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
     </div>
   );

   return (
    <div className="fixed inset-0 -z-10 bg-black">
      <Canvas 
        shadows={graphicsQuality === 'high'}
        dpr={dpr}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 6, 14], fov: 50 }}
    >
        <color attach="background" args={[skyColor]} />
        
        {/* Sky gradient dome */}
        {graphicsQuality !== 'low' && <SkyDome skyColor={skyColor} hour={hour} quality={graphicsQuality} />}
        
        <ambientLight intensity={hour >= 19 || hour < 6 ? 0.2 : 0.5} />
        
        {/* Visible Sun/Moon */}
        <group>
            {hour >= 5.5 && hour < 19.5 ? (
                <group position={sunPosition}>
                    <mesh>
                        <sphereGeometry args={[4.5, 32, 32]} />
                        <meshBasicMaterial color={hour > 17 || hour < 7.5 ? "#e8a050" : "#fff8e8"} />
                    </mesh>
                    <mesh scale={[1.8, 1.8, 1.8]}>
                        <sphereGeometry args={[4.5, 16, 16]} />
                        <meshBasicMaterial color={hour > 17 || hour < 7.5 ? "#c47838" : "#fff4e0"} transparent opacity={0.15} />
                    </mesh>
                    <mesh scale={[2.8, 2.8, 2.8]}>
                        <sphereGeometry args={[4.5, 12, 12]} />
                        <meshBasicMaterial color={hour > 17 || hour < 7.5 ? "#b06830" : "#fff0d8"} transparent opacity={0.06} />
                    </mesh>
                    <pointLight intensity={hour > 17 ? 2.2 : 1.5} distance={150} color={hour > 17 ? "#d4905a" : "#fff8f0"} />
                </group>
            ) : (
                <group position={[0, 40, -40]}>
                    <mesh>
                        <sphereGeometry args={[3.5, 24, 24]} />
                        <meshBasicMaterial color="#e8edf5" />
                    </mesh>
                    <mesh position={[-0.8, 0.5, 2.8]} scale={[0.5, 0.5, 0.15]}>
                        <sphereGeometry args={[1, 12, 12]} />
                        <meshBasicMaterial color="#cbd5e1" />
                    </mesh>
                    <mesh position={[1.0, -0.3, 2.6]} scale={[0.35, 0.35, 0.1]}>
                        <sphereGeometry args={[1, 10, 10]} />
                        <meshBasicMaterial color="#c8d1de" />
                    </mesh>
                    <mesh position={[0.2, 1.2, 2.9]} scale={[0.25, 0.25, 0.08]}>
                        <sphereGeometry args={[1, 8, 8]} />
                        <meshBasicMaterial color="#d1d8e3" />
                    </mesh>
                    <mesh scale={[1.6, 1.6, 1.6]}>
                        <sphereGeometry args={[3.5, 16, 16]} />
                        <meshBasicMaterial color="#c7d2fe" transparent opacity={0.08} />
                    </mesh>
                    <mesh scale={[2.5, 2.5, 2.5]}>
                        <sphereGeometry args={[3.5, 12, 12]} />
                        <meshBasicMaterial color="#a5b4fc" transparent opacity={0.03} />
                    </mesh>
                    <pointLight intensity={0.7} distance={60} color="#c7d2fe" />
                </group>
            )}
        </group>

        <directionalLight 
            position={sunPosition.map(v => v / 5) as [number, number, number]} 
            intensity={hour >= 19.5 || hour < 5.5 ? 0.3 : (treeStyle === 'sakura' ? 1.0 : 1.2)} 
            color={hour >= 18.5 ? '#c47858' : hour >= 17 ? '#d4a060' : treeStyle === 'sakura' ? '#fff1f2' : '#fff8f0'}
            castShadow={graphicsQuality === 'high'}
            shadow-mapSize={graphicsQuality === 'high' ? [1024, 1024] : [512, 512]} 
            shadow-bias={-0.0001}
        />

        <pointLight position={[-10, 5, -10]} intensity={0.5} color={skyColor} />
        
        {graphicsQuality !== 'low' && (
            <>
                <Environment 
                    preset={hour >= 19.5 || hour < 6 ? "night" : (hour >= 17 ? "sunset" : (hour < 8 ? "dawn" : "forest"))} 
                    blur={0.8} 
                    background={false} 
                    resolution={256} 
                />
                <GodRays sunPosition={sunPosition} hour={hour} quality={graphicsQuality} />
                <Nebula treeStyle={treeStyle} hour={hour} quality={graphicsQuality} />
                
                {hour >= 6 && hour < 19.5 && !['neon', 'midnight', 'frozen'].includes(treeStyle) && (
                    <Sky 
                        sunPosition={sunPosition} 
                        turbidity={treeStyle === 'sakura' ? 0.3 : (hour > 16.5 || hour < 7.5 ? 6 : 2)} 
                        rayleigh={treeStyle === 'sakura' ? 0.1 : (hour > 16.5 || hour < 7.5 ? 2 : 0.4)} 
                        mieCoefficient={0.005} 
                        mieDirectionalG={0.8} 
                    />
                )}
            </>
        )}

        <pointLight 
            position={[sunPosition[0] * 0.1, 4, sunPosition[2] * 0.1]} 
            intensity={hour > 17 ? 0.8 : 0.2} 
            color={skyColor} 
            distance={15}
        />

        {graphicsQuality !== 'low' && (
            <ContactShadows opacity={0.6} scale={40} blur={2} far={4} resolution={graphicsQuality === 'high' ? 1024 : 512} color="#000000" frames={1} />
        )}

        <fog attach="fog" args={[skyColor, 8, 35]} />
        
        {graphicsQuality !== 'low' && (hour >= 19 || hour < 6 || ['neon', 'midnight'].includes(treeStyle)) && <Stars radius={100} depth={50} count={graphicsQuality === 'high' ? 5000 : 2000} factor={4} saturation={0} fade speed={1} />}
        
        {graphicsQuality !== 'low' && !['neon', 'midnight', 'frozen'].includes(treeStyle) && (
            <Clouds hour={hour} theme={theme} quality={graphicsQuality} />
        )}
        
        {(hour >= 19 || hour < 6) && <ShootingStar quality={graphicsQuality} />}
        
        {graphicsQuality !== 'low' && <Aurora hour={hour} quality={graphicsQuality} />}
        {graphicsQuality !== 'low' && <HorizonGlow hour={hour} quality={graphicsQuality} />}
        {graphicsQuality !== 'low' && <CirrusClouds hour={hour} quality={graphicsQuality} />}
        {graphicsQuality !== 'low' && <MilkyWay hour={hour} quality={graphicsQuality} />}
        {graphicsQuality !== 'low' && <SkyColorBands hour={hour} quality={graphicsQuality} />}
        
        {graphicsQuality !== 'low' && (
            <Sparkles count={graphicsQuality === 'high' ? 25 : 12} scale={15} size={2} speed={0.4} opacity={0.6} color={theme.particle} />
        )}
        
        {graphicsQuality !== 'low' && (petEmotion === 'excited' || petEmotion === 'playing') && (
            <Sparkles count={graphicsQuality === 'high' ? 100 : 50} scale={8} size={6} speed={2} color="#fcd34d" noise={1} />
        )}

        <OrbitControls 
            makeDefault
            enablePan={graphicsQuality !== 'low'} 
            enableDamping={true}
            dampingFactor={0.05}
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2.1} 
            maxDistance={20} 
            minDistance={4} 
        />

        <SpawnIn delay={0.2} position={[0, -0.1, 0]}>
            <Terrain theme={theme} quality={graphicsQuality} />
        </SpawnIn>

        {/* Main tree — draggable in edit mode, position stored as main_tree PurchasedItem */}
        {(() => {
          const mainTreeItem = purchasedItems?.find(i => i.type === 'main_tree');
          const treeInitialPos: [number, number, number] = [mainTreeItem?.x ?? 0, 0, mainTreeItem?.z ?? 0];
          if (isEditMode) {
            const fakeItem: PurchasedItem = mainTreeItem ?? { id: 'main_tree', type: 'main_tree', x: 0, y: 0, z: 0, rotation: 0, landId: activeLandId ?? '' };
            return (
              <SpawnIn key="tree-edit" delay={0.6} position={treeInitialPos}>
                <DraggableItem
                  item={{ ...fakeItem, x: 0, y: 0, z: 0 }}
                  onUpdate={async (id, x, y, z) => {
                    if (onUpdateItemPosition) onUpdateItemPosition(id, x, y, z);
                    // If this is the placeholder fake item, create a real DB record first
                    if (!mainTreeItem && activeLandId) {
                      try {
                        await fetch('/api/purchased-items', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'main_tree', landId: activeLandId, x, y: 0, z })
                        });
                      } catch (e) { console.error('Failed to create main_tree item', e); }
                    }
                  }}
                >
                  <group onClick={() => { setShakeTree(true); setTimeout(() => setShakeTree(false), 500); }}>
                    <Tree theme={theme} scale={growthScale} leafCount={leaves} windFactor={windFactor} branchCount={branchCount} quality={graphicsQuality} shake={shakeTree} />
                  </group>
                </DraggableItem>
              </SpawnIn>
            );
          }
          return (
            <SpawnIn key="tree" delay={0.6} position={treeInitialPos}>
              <group onClick={() => { setShakeTree(true); setTimeout(() => setShakeTree(false), 500); }}>
                <Tree theme={theme} scale={growthScale} leafCount={leaves} windFactor={windFactor} branchCount={branchCount} quality={graphicsQuality} shake={shakeTree} />
              </group>
            </SpawnIn>
          );
        })()}
         
          {showExplosion && <LeafExplosion count={graphicsQuality === 'low' ? 15 : 30} color={theme.particle} />}

          {floatingTexts.map(ft => (
             <FloatingText key={ft.id} text={ft.text} position={ft.position} color={ft.color} />
          ))}

          {(!pets || pets.length === 0) ? (
            <SpawnIn key="default-pet" delay={1.6}>
              <Pet3D emotion={petEmotion} theme={theme} petType={petType} startPos={[2, 0, 2]} quality={graphicsQuality} />
            </SpawnIn>
         ) : (() => {
            const petRefs = pets.map(() => React.createRef<THREE.Group | null>());
            return pets.map((pet, i) => {
              const angle = (i / pets.length) * Math.PI * 2;
              const radius = 2.5 + (i * 0.5);
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              const companions = pets
                 .map((p, idx) => ({ ref: petRefs[idx], type: p.type }))
                 .filter((_, idx) => idx !== i);

              return (
                <SpawnIn key={pet.id} delay={1.6 + i * 0.15}>
                  <Pet3D
                    ref={petRefs[i]}
                    emotion={petEmotion}
                    theme={theme}
                    petType={pet.type}
                    startPos={[x, 0, z]}
                    otherPets={companions}
                    quality={graphicsQuality}
                  />
                </SpawnIn>
              );
            });
         })()}

         {purchasedItems?.map((item, idx) => {
            if (item.type === 'dog' || item.type === 'cat') {
               return (
                 <SpawnIn key={item.id} delay={2.0 + idx * 0.12}>
                   <Pet3D emotion={petEmotion} theme={theme} petType={item.type} startPos={[item.x || 0, 0, item.z || 0]} quality={graphicsQuality} />
                 </SpawnIn>
               );
            }

            return (
               <SpawnIn key={item.id} delay={2.0 + idx * 0.12}>
                 <DraggableItem item={item} onUpdate={onUpdateItemPosition}>
                   {item.type === 'custom_3d' && item.modelUrl && <CustomGLTFModel url={item.modelUrl} scale={1} />}
                   {item.type === 'flower1' && <Flower type="sunflower" position={[0, 0, 0]} scale={1.5} windFactor={windFactor} />}
                   {item.type === 'rock1' && <GardenProp type="rock" position={[0, 0, 0]} />}
                   {item.type === 'tree1' && <Tree theme={theme} scale={0.5} leafCount={20} branchCount={4} quality={graphicsQuality} />}
                   {item.type === 'house1' && (
                     <mesh position={[0, 1.5, 0]}>
                       <boxGeometry args={[3, 3, 3]} />
                       <meshStandardMaterial color="#fcd34d" />
                       <mesh position={[0, 2, 0]}>
                         <coneGeometry args={[2.5, 2, 4]} />
                         <meshStandardMaterial color="#ef4444" />
                       </mesh>
                     </mesh>
                   )}
                 </DraggableItem>
               </SpawnIn>
            );
         })}

          <group>
             <SpawnIn delay={1.0}>
               <group>
                 {flowerPositions.map((pos, i) => (
                   <Flower
                     key={i}
                     position={[pos.x, 0, pos.z]}
                     type={pos.type}
                     scale={pos.scale}
                     windFactor={windFactor}
                     quality={graphicsQuality}
                   />
                 ))}
               </group>
             </SpawnIn>

             <SpawnIn delay={1.2}>
               <group>
                 {grassPositions.map((pos, i) => (
                   <Grass key={i} theme={theme} position={pos} windFactor={windFactor} quality={graphicsQuality} />
                 ))}
               </group>
             </SpawnIn>

             {graphicsQuality !== 'low' && (
               <>
                 <Butterfly flowers={flowerPositions} />
                 {graphicsQuality === 'high' && (
                   <>
                     <Butterfly flowers={flowerPositions} />
                     <Butterfly flowers={flowerPositions} />
                   </>
                 )}
               </>
             )}

             {graphicsQuality !== 'low' && Array.from({ length: graphicsQuality === 'high' ? 10 : 5 }).map((_, i) => (
               <FallingLeaf key={i} theme={theme} quality={graphicsQuality} />
             ))}

             {graphicsQuality === 'high' && (
               <>
                 <Bird />
                 <Bird />
               </>
             )}

             <SpawnIn delay={1.35} position={[-3, 0, 3]}>
               <GardenProp position={[0, 0, 0]} type="rock" />
             </SpawnIn>
             <SpawnIn delay={1.45} position={[-4, 0, -3]}>
               <GardenProp position={[0, 0, 0]} type="fence" />
             </SpawnIn>
             <SpawnIn delay={1.5} position={[-3.2, 0, -3]}>
               <GardenProp position={[0, 0, 0]} type="fence" />
             </SpawnIn>

             <SpawnIn delay={1.55}>
               <Pond />
             </SpawnIn>
             <FallingPetals theme={theme} count={graphicsQuality === 'high' ? 60 : (graphicsQuality === 'medium' ? 30 : 0)} />
             {graphicsQuality !== 'low' && <Fireflies count={graphicsQuality === 'high' ? 50 : 20} />}
             <SpawnIn delay={1.3}>
               <StonePath quality={graphicsQuality} />
             </SpawnIn>
          </group>

         {graphicsQuality === 'high' && <ContactShadows scale={30} blur={2.5} far={4} opacity={0.4} resolution={512} frames={1} />}

         {/* Edit Mode Grid Overlay */}
         {isEditMode && (
           <Grid
             args={[50, 50]}
             position={[0, 0.01, 0]}
             cellSize={1}
             cellThickness={0.6}
             cellColor="#6b7280"
             sectionSize={5}
             sectionThickness={1.2}
             sectionColor="#ec4899"
             fadeDistance={30}
             fadeStrength={1}
             followCamera={false}
             infiniteGrid={true}
           />
         )}

      </Canvas>
      


        <AnimatePresence>
          {isEditMode && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsShopPopoverOpen(!isShopPopoverOpen)}
              className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xl transition-all border-2 ${
                isShopPopoverOpen
                  ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/40'
                  : 'bg-white/80 backdrop-blur-md text-amber-600 border-white/50 hover:bg-white'
              }`}
              title="Open Shop"
            >
              <i className="fas fa-store"></i>
            </motion.button>
          )}
        </AnimatePresence>
      </div>



      {/* Floating Shop Popover */}
      <AnimatePresence>
        {isShopPopoverOpen && isEditMode && onPurchase && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="fixed bottom-24 left-24 z-[80] w-80 max-h-[60vh] bg-white/95 backdrop-blur-xl rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-amber-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-amber-700 flex items-center gap-2">
                  <i className="fas fa-store"></i> Shop
                </h3>
                <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest">Drag items to your world</p>
              </div>
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md flex items-center gap-1.5 text-sm shadow-sm border border-amber-200">
                <i className="fas fa-coins text-amber-500 text-xs"></i>
                <span className="font-black">{points}</span>
              </div>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar">
              <Shop
                points={points}
                activeLandId={activeLandId}
                onPurchase={onPurchase}
                compact={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQRCode && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed bottom-6 left-6 z-[70] hidden md:flex flex-col items-center gap-2 group"
          >
             <div 
                className="bg-white/80 backdrop-blur-xl p-3 rounded-md shadow-2xl border border-white/50 cursor-pointer hover:scale-105 transition-transform relative overflow-hidden active:scale-95"
                onClick={() => setIsQRUploadOpen(true)}
              >
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=ec4899`} 
                   alt="Upload QR" 
                   className="w-24 h-24 rounded-md"
                 />
                 <div className="absolute inset-0 bg-pink-500/0 group-hover:bg-pink-500/5 transition-colors flex items-center justify-center">
                    <i className="fas fa-expand text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                 </div>
              </div>
              <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-lg border border-pink-100 flex items-center gap-2">
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                 </span>
                 <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest leading-none">Scan to Upload 📱</p>
              </div>
          </motion.div>
        )}

        {isQRUploadOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
             onClick={() => setIsQRUploadOpen(false)}
           >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                 <div className="p-8 text-center space-y-4">
                    <div className="w-20 h-20 bg-pink-100 rounded-md flex items-center justify-center text-pink-500 text-3xl mx-auto mb-2">
                       <i className="fas fa-qrcode"></i>
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Upload via Phone</h2>
                    <p className="text-sm text-gray-400 font-medium pb-2">Scan this QR code with your phone camera to open the uploader.</p>
                    
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=ec4899`} 
                      alt="Large Upload QR" 
                      className="w-48 h-48 mx-auto rounded-md shadow-sm border border-pink-50"
                    />

                    {albums.length > 0 && (
                      <div className="text-left bg-pink-50 rounded-md p-4 mt-6">
                        <label className="block text-[10px] uppercase font-black text-pink-500 tracking-widest mb-2 ml-1">Destination Album</label>
                        <select
                          value={selectedAlbumId}
                          onChange={(e) => setSelectedAlbumId(e.target.value)}
                          className="w-full bg-white border border-pink-100 rounded-md p-3 text-sm font-bold text-gray-700 outline-none cursor-pointer hover:border-pink-300 transition-colors"
                        >
                          <option value="">No Album (Global Gallery)</option>
                          {albums.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      onClick={() => setIsQRUploadOpen(false)}
                      className="w-full bg-gray-100 text-gray-500 font-black py-4 rounded-md mt-4 hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
                    >
                       Close
                    </button>
                 </div>
                 <div className="bg-pink-500 p-1"></div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoveTree3D;
