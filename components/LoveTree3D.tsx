"use client"; 

import * as React from 'react';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { ShopItem } from './Shop';

import { Emotion, ItemTransformUpdate, PurchasedItem } from '../types';
import { THEMES } from './3d/GardenConstants';
import { LoveTreeCanvasScene } from './love-tree3d/LoveTreeCanvasScene';
import { MobileGameOverlays } from './love-tree3d/MobileGameOverlays';
import { MovementInput, nextSeededRatio, seededRatio } from './game-engine-3d';

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
  onUpdateItemPosition?: (id: string, update: ItemTransformUpdate) => void;
  activeLandId?: string;
  onPurchase?: (item: ShopItem) => Promise<void>;
  landName?: string;
  onOpenWorldMap?: () => void;
  isEditMode?: boolean;
  setIsEditMode?: (val: boolean) => void;
}


const LoveTree3D: React.FC<LoveTree3DProps> = ({ 
    anniversaryDate, treeStyle = 'oak', petEmotion, petMessage, level,
     leaves, points = 0, onAddLeaf, daysPerFlower = 7, flowerType = 'sunflower',
     mixedFlowers = ['sunflower', 'tulip', 'rose', 'cherry', 'lavender', 'heart'],
     skyMode = 'follow_timezone', showQRCode = false, petType = 'cat',
     pets = [], albums = [],
     graphicsQuality = 'medium',
     purchasedItems = [], onUpdateItemPosition,
     activeLandId, onPurchase, landName, onOpenWorldMap,
     isEditMode = false, setIsEditMode
 }) => {
   void petMessage;
   void level;
   const [isShopPopoverOpen, setIsShopPopoverOpen] = useState(false);
   const [cameraMode, setCameraMode] = useState<'orbit' | 'explore'>('explore');
   const [movement, setMovement] = useState<MovementInput>({ forward: false, back: false, left: false, right: false });
   const [snapToGrid, setSnapToGrid] = useState(true);
   const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
   const theme = THEMES[treeStyle] || THEMES['oak'];
   const [isQRUploadOpen, setIsQRUploadOpen] = useState(false);
   const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
   const [showExplosion, setShowExplosion] = useState(false);
   const [shakeTree, setShakeTree] = useState(false);
   const [floatingTexts, setFloatingTexts] = useState<Array<{ id: number; text: string; position: [number, number, number]; color: string }>>([]);
   const prevLeafCount = useRef(leaves);
   const floatingTextSeed = useRef(0x9e3779b9);

   const selectedItem = useMemo(
     () => purchasedItems?.find(item => item.id === selectedItemId) ?? null,
     [purchasedItems, selectedItemId]
   );

   const placedItemCount = purchasedItems?.filter(item => item.type !== 'main_tree').length ?? 0;
   const gardenQuests = useMemo(() => [
     {
       id: 'build',
       label: 'Place a keepsake',
       detail: placedItemCount > 0 ? `${placedItemCount} placed` : 'Open Build and choose one',
       done: placedItemCount > 0,
       icon: 'fa-cube',
     },
     {
       id: 'grow',
       label: 'Grow the love tree',
       detail: leaves > 0 ? `${leaves.toLocaleString()} leaves` : 'Earn points, then grow',
       done: leaves > 0,
       icon: 'fa-leaf',
     },
     {
       id: 'explore',
       label: 'Take a garden walk',
       detail: cameraMode === 'explore' ? 'Walking now' : 'Switch to Explore',
       done: cameraMode === 'explore',
       icon: 'fa-shoe-prints',
     },
   ], [cameraMode, leaves, placedItemCount]);

   React.useEffect(() => {
     if (!selectedItemId) return;
     if (!purchasedItems?.some(item => item.id === selectedItemId)) {
       setSelectedItemId(null);
     }
   }, [purchasedItems, selectedItemId]);

   React.useEffect(() => {
     const keyMap: Record<string, keyof MovementInput> = {
       w: 'forward',
       arrowup: 'forward',
       s: 'back',
       arrowdown: 'back',
       a: 'left',
       arrowleft: 'left',
       d: 'right',
       arrowright: 'right',
     };

     const setKey = (event: KeyboardEvent, pressed: boolean) => {
       const movementKey = keyMap[event.key.toLowerCase()];
       if (!movementKey || cameraMode !== 'explore') return;
       event.preventDefault();
       setMovement(prev => ({ ...prev, [movementKey]: pressed }));
     };

     const onKeyDown = (event: KeyboardEvent) => setKey(event, true);
     const onKeyUp = (event: KeyboardEvent) => setKey(event, false);

     window.addEventListener('keydown', onKeyDown);
     window.addEventListener('keyup', onKeyUp);
     return () => {
       window.removeEventListener('keydown', onKeyDown);
       window.removeEventListener('keyup', onKeyUp);
     };
   }, [cameraMode]);

   React.useEffect(() => {
     if (cameraMode !== 'explore') {
       setMovement({ forward: false, back: false, left: false, right: false });
     }
   }, [cameraMode]);

   React.useEffect(() => {
     if (isEditMode && cameraMode === 'explore') {
       setCameraMode('orbit');
     }
   }, [cameraMode, isEditMode]);

   React.useEffect(() => {
     if (!isEditMode) {
       setIsShopPopoverOpen(false);
       setIsQRUploadOpen(false);
     }
   }, [isEditMode]);

   const toggleShopPopover = () => {
     setIsShopPopoverOpen(prev => {
       const next = !prev;
       if (next) setIsQRUploadOpen(false);
       return next;
     });
   };

   const openQRUpload = () => {
     setIsShopPopoverOpen(false);
     setIsQRUploadOpen(true);
   };

   const toggleBuildMode = () => {
     const nextMode = !isEditMode;
     setIsEditMode?.(nextMode);
     if (nextMode) {
       setCameraMode('orbit');
       setIsQRUploadOpen(false);
     } else {
       setIsShopPopoverOpen(false);
       setSelectedItemId(null);
     }
   };

   const pressMovement = (key: keyof MovementInput, pressed: boolean) => {
     setMovement(prev => ({ ...prev, [key]: pressed }));
   };

   const rotateSelectedItem = (delta: number) => {
     if (!selectedItem || !onUpdateItemPosition) return;
     onUpdateItemPosition(selectedItem.id, {
       x: selectedItem.x,
       y: selectedItem.y,
       z: selectedItem.z,
       rotation: (selectedItem.rotation ?? 0) + delta,
     });
   };

   // Trigger explosion and floating text logic
   React.useEffect(() => {
     if (leaves > prevLeafCount.current) {
        setShowExplosion(true);
        const t = setTimeout(() => setShowExplosion(false), 2000);
        
        // Add floating text
        const id = Date.now();
        const randomX = (nextSeededRatio(floatingTextSeed) - 0.5) * 3;
        const randomZ = (nextSeededRatio(floatingTextSeed) - 0.5) * 3;
        const height = 4 + nextSeededRatio(floatingTextSeed) * 2;
        
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
        const radius = 3 + seededRatio(i + 1) * 10;
        const angle = seededRatio(i + 31) * Math.PI * 2;
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
     <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
     </div>
   );

   return (
    <div className="absolute inset-0 bg-black">
      <LoveTreeCanvasScene
        graphicsQuality={graphicsQuality}
        dpr={dpr}
        skyColor={skyColor}
        hour={hour}
        sunPosition={sunPosition}
        treeStyle={treeStyle}
        theme={theme}
        petEmotion={petEmotion}
        cameraMode={cameraMode}
        isEditMode={isEditMode}
        movement={movement}
        purchasedItems={purchasedItems}
        activeLandId={activeLandId}
        onUpdateItemPosition={onUpdateItemPosition}
        selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId}
        snapToGrid={snapToGrid}
        growthScale={growthScale}
        leaves={leaves}
        windFactor={windFactor}
        branchCount={branchCount}
        shakeTree={shakeTree}
        setShakeTree={setShakeTree}
        showExplosion={showExplosion}
        floatingTexts={floatingTexts}
        pets={pets}
        petType={petType}
        flowerPositions={flowerPositions}
        grassPositions={grassPositions}
      />
      <MobileGameOverlays
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        points={points}
        landName={landName}
        toggleBuildMode={toggleBuildMode}
        canGrowLeaf={points >= 100}
        onAddLeaf={onAddLeaf}
        onOpenWorldMap={onOpenWorldMap}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        gardenQuests={gardenQuests}
        pressMovement={pressMovement}
        selectedItem={selectedItem}
        setSelectedItemId={setSelectedItemId}
        rotateSelectedItem={rotateSelectedItem}
        isShopPopoverOpen={isShopPopoverOpen}
        toggleShopPopover={toggleShopPopover}
        onPurchase={onPurchase}
        activeLandId={activeLandId}
        showQRCode={showQRCode}
        openQRUpload={openQRUpload}
        isQRUploadOpen={isQRUploadOpen}
        setIsQRUploadOpen={setIsQRUploadOpen}
        selectedAlbumId={selectedAlbumId}
        setSelectedAlbumId={setSelectedAlbumId}
        albums={albums}
      />
    </div>
  );
};

export default LoveTree3D;
