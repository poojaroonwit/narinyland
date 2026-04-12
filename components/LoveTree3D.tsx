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
    activeLandId, onPurchase
 }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [isShopPopoverOpen, setIsShopPopoverOpen] = useState(false);
    const theme = THEMES[treeStyle] || THEMES['oak'];
    const [isQRUploadOpen, setIsQRUploadOpen] = useState(false);
    const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
    const [showExplosion, setShowExplosion] = useState(false);
    const [shakeTree, setShakeTree] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; position: [number, number, number]; color: string }>>([]);
    const prevLeafCount = useRef(leaves);

    React.useEffect(() => {
      if (leaves > prevLeafCount.current) {
         setShowExplosion(true);
         const t = setTimeout(() => setShowExplosion(false), 2000);
         const id = Date.now();
         const randomX = (Math.random() - 0.5) * 3;
         const randomZ = (Math.random() - 0.5) * 3;
         const height = 4 + Math.random() * 2;
         
         setFloatingTexts(prev => [
             ...prev, 
             { id, text: "+1 🍃", position: [randomX, height, randomZ], color: theme.leaves[1] }
         ]);

         setTimeout(() => {
             setFloatingTexts(prev => prev.filter(item => item.id !== id));
         }, 2000);

         prevLeafCount.current = leaves;
         return () => clearTimeout(t);
      }
      prevLeafCount.current = leaves;
    }, [leaves, theme]);

    const { growthScale, branchCount } = useMemo(() => {
      let scale = 1;
      let branchCount = 6;
      if (leaves < 50) {
          const progress = Math.max(0, leaves / 50);
          scale = 0.8 + (progress * 0.2); 
          branchCount = 6;
      } else if (leaves < 100) {
          const progress = (leaves - 50) / 50;
          scale = 1.0 + (progress * 0.2); 
          branchCount = 6 + Math.floor(progress * 4); 
      } else {
          const progress = Math.min((leaves - 100) / 900, 1);
          scale = 1.2 + (progress * 0.8); 
          branchCount = 10 + Math.floor(progress * 10); 
      }
      return { growthScale: scale, branchCount };
  }, [leaves]);

  const daysTogether = useMemo(() => {
    const start = new Date(anniversaryDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [anniversaryDate]);

  const flowerCount = Math.floor(daysTogether / daysPerFlower);

  const flowerPositions = useMemo(() => {
    const pos = [];
    const maxFlowers = graphicsQuality === 'high' ? 150 : (graphicsQuality === 'medium' ? 80 : 30);
    const count = Math.min(flowerCount, maxFlowers); 
    const activeFlowers = (mixedFlowers && mixedFlowers.length > 0) ? mixedFlowers : ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'];

    for(let i=0; i<count; i++) {
        const r1 = Math.sin(i * 123.456) % 1;
        const r2 = Math.sin(i * 789.012) % 1;
        const r3 = Math.sin(i * 456.789) % 1;
        const angle = i * 137.5 + r1 * 45; 
        const radius = 2.8 + Math.sqrt(i) * 0.7 + r2 * 1.8;
        const x = Math.cos(angle * Math.PI / 180) * radius;
        const z = Math.sin(angle * Math.PI / 180) * radius;
        const s = 0.7 + Math.abs(r3) * 0.6;
        const t = flowerType === 'mixed' ? activeFlowers[Math.floor(Math.abs(r1) * activeFlowers.length)] : flowerType;
        pos.push({ x, z, type: t, scale: s });
    }
    return pos;
  }, [flowerCount, flowerType, mixedFlowers, graphicsQuality]);
  
  const [isMounted, setIsMounted] = useState(false);
  const [currentHour, setCurrentHour] = useState(12);

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
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [skyMode]);

  const hour = currentHour;
  
  const windFactor = useMemo(() => {
      switch(petEmotion) {
          case 'excited': case 'playing': return 2.2;
          case 'happy': return 1.0;
          case 'waiting': case 'thinking': return 0.7;
          case 'sleeping': return 0.3;
          default: return 1.0;
      }
  }, [petEmotion]);

  const skyColor = useMemo(() => {
      if (['neon', 'midnight'].includes(treeStyle)) return theme.bg;
      if (hour >= 21 || hour < 4.5) return '#08101f';
      if (hour >= 4.5 && hour < 5.5) return '#1a1a2e';
      if (hour >= 5.5 && hour < 6.25) return '#c9a87c';
      if (hour >= 6.25 && hour < 7.5) return '#7db8d4';
      if (hour >= 7.5 && hour < 10) return '#5b9fd4';
      if (hour >= 10 && hour < 15) return '#5b9fd4';
      if (hour >= 15 && hour < 17) return '#8fb4c9';
      if (hour >= 17 && hour < 18.5) return '#d4845a';
      if (hour >= 18.5 && hour < 19.5) return '#2d1b4e';
      if (hour >= 19.5 && hour < 20) return '#111827';
      if (hour >= 20 && hour < 21) return '#08101f';
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
    const base = window.devicePixelRatio || 1;
    if (graphicsQuality === 'low') return Math.min(0.8, base);
    if (graphicsQuality === 'medium') return Math.min(1.0, base);
    return Math.min(1.5, base);
  }, [graphicsQuality]);

  if (!isMounted) return (
    <div className="fixed inset-0 -z-10 bg-black flex items-center justify-center">
       <div className="w-12 h-12 border-4 border-white/5 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 -z-10 bg-black font-geist">
      <Canvas 
        shadows={graphicsQuality === 'high'}
        dpr={dpr}
        performance={{ min: 0.5 }}
        camera={{ position: [0, 6, 14], fov: 50 }}
      >
        <color attach="background" args={[skyColor]} />
        {graphicsQuality !== 'low' && <SkyDome skyColor={skyColor} hour={hour} quality={graphicsQuality} />}
        <ambientLight intensity={hour >= 19 || hour < 6 ? 0.2 : 0.5} />
        
        <group>
            {hour >= 5.5 && hour < 19.5 ? (
                <group position={sunPosition}>
                    <mesh>
                        <sphereGeometry args={[4.5, 32, 32]} />
                        <meshBasicMaterial color={hour > 17 || hour < 7.5 ? "#e8a050" : "#fff8e8"} />
                    </mesh>
                    <pointLight intensity={hour > 17 ? 2.2 : 1.5} distance={150} color={hour > 17 ? "#d4905a" : "#fff8f0"} />
                </group>
            ) : (
                <group position={[0, 40, -40]}>
                    <mesh><sphereGeometry args={[3.5, 24, 24]} /><meshBasicMaterial color="#e8edf5" /></mesh>
                    <pointLight intensity={0.7} distance={60} color="#c7d2fe" />
                </group>
            )}
        </group>

        <directionalLight 
            position={sunPosition.map(v => v / 5) as [number, number, number]} 
            intensity={hour >= 19.5 || hour < 5.5 ? 0.3 : 1.2} 
            color={hour >= 18.5 ? '#c47858' : '#fff8f0'}
            castShadow={graphicsQuality === 'high'}
        />

        {graphicsQuality !== 'low' && (
            <>
                <Environment preset={hour >= 19.5 || hour < 6 ? "night" : "forest"} blur={0.8} />
                <GodRays sunPosition={sunPosition} hour={hour} quality={graphicsQuality} />
                {hour >= 6 && hour < 19.5 && <Sky sunPosition={sunPosition} turbidity={2} rayleigh={0.4} />}
            </>
        )}

        {graphicsQuality !== 'low' && <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />}
        {graphicsQuality !== 'low' && <Sparkles count={12} scale={15} size={2} color={theme.particle} />}

        <OrbitControls makeDefault minDistance={4} maxDistance={20} maxPolarAngle={Math.PI / 2.1} />

        <SpawnIn delay={0.2} position={[0, -0.1, 0]}>
            <Terrain theme={theme} quality={graphicsQuality} />
        </SpawnIn>

        <group position={[0, 0, 0]}>
             <Tree theme={theme} scale={growthScale} leafCount={leaves} windFactor={windFactor} branchCount={branchCount} quality={graphicsQuality} shake={shakeTree} />
        </group>
         
        {showExplosion && <LeafExplosion count={20} color={theme.particle} />}
        {floatingTexts.map(ft => <FloatingText key={ft.id} text={ft.text} position={ft.position} color={ft.color} />)}

        <Pet3D emotion={petEmotion} theme={theme} petType={petType} startPos={[2, 0, 2]} quality={graphicsQuality} />

        {purchasedItems?.filter(i => i.type !== 'main_tree').map((item) => (
          <DraggableItem key={item.id} item={item} onUpdate={onUpdateItemPosition}>
             {item.type === 'custom_3d' && item.modelUrl && <CustomGLTFModel url={item.modelUrl} />}
             {item.type === 'flower1' && <Flower type="sunflower" position={[0, 0, 0]} scale={2} />}
          </DraggableItem>
        ))}

        <group>
           {flowerPositions.map((pos, i) => <Flower key={i} position={[pos.x, 0, pos.z]} type={pos.type} scale={pos.scale} windFactor={windFactor} />)}
           <Pond />
           {graphicsQuality !== 'low' && <Fireflies count={20} />}
        </group>

        {isEditMode && (
          <Grid args={[50, 50]} position={[0, 0.01, 0]} cellSize={1} cellColor="#333" sectionSize={5} sectionColor="#000" fadeDistance={30} infiniteGrid={true} />
        )}
      </Canvas>
      
      {/* UI Overlay Refactored to Minimalist aesthetic */}
      <div className="fixed bottom-24 left-10 z-[70] flex flex-col items-start gap-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsEditMode(!isEditMode);
            if (isEditMode) setIsShopPopoverOpen(false);
          }}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-xs font-black transition-all ${
            isEditMode ? 'bg-black text-white' : 'bg-white/90 backdrop-blur-3xl text-black border border-black/5'
          }`}
        >
          {isEditMode ? <i className="fas fa-times"></i> : <i className="fas fa-pencil-alt"></i>}
        </motion.button>

        <AnimatePresence>
          {isEditMode && (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsShopPopoverOpen(!isShopPopoverOpen)}
              className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-3xl text-black shadow-2xl flex items-center justify-center text-xs font-black border border-black/5"
            >
              <i className="fas fa-store"></i>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isEditMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-black text-white px-8 py-3 rounded-pill shadow-2xl flex items-center gap-4 border border-white/10"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">ARCHITECTURE MODE</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShopPopoverOpen && isEditMode && onPurchase && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed bottom-24 left-32 z-[80] w-80 max-h-[60vh] bg-white/95 backdrop-blur-3xl rounded-clay shadow-2xl border border-black/5 overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-black/5 flex justify-between items-center bg-white/50">
              <div>
                <p className="text-[8px] font-black text-black opacity-20 uppercase tracking-[0.3em]">SUPPLY</p>
                <h3 className="font-black text-black text-xs uppercase tracking-tight">RESOURCE SHOP</h3>
              </div>
              <div className="bg-black text-white px-4 py-1.5 rounded-pill text-[10px] font-black tracking-widest shadow-xl">
                {points} PTS
              </div>
            </div>
            <div className="overflow-y-auto p-4 custom-scrollbar">
              <Shop points={points} activeLandId={activeLandId} onPurchase={onPurchase} compact={true} />
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
            className="fixed bottom-10 left-10 z-[70] hidden md:flex flex-col items-start gap-4"
          >
             <div 
                className="bg-white/50 backdrop-blur-3xl p-4 rounded-clay shadow-2xl border border-white/20 cursor-pointer hover:bg-white/80 transition-all active:scale-95 grayscale hover:grayscale-0 duration-700"
                onClick={() => setIsQRUploadOpen(true)}
              >
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/upload${selectedAlbumId ? `?albumId=${selectedAlbumId}` : ''}` : 'https://example.com/upload')}&color=000000`} 
                   alt="QR" 
                   className="w-24 h-24 rounded-lg opacity-80"
                 />
              </div>
              <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-pill shadow-xl border border-white/5 flex items-center gap-3">
                 <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                 <p className="text-[9px] font-black text-white uppercase tracking-[0.3em]">REMOTE UPLOAD READY</p>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoveTree3D;
