"use client";

import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Sky, Stars, Sparkles, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Emotion, ItemTransformUpdate, PurchasedItem } from '../../types';
import { THEMES } from '../3d/GardenConstants';
import { Pet3D } from '../3d/Pet';
import { Tree } from '../3d/Tree';
import { Flower } from '../3d/Flower';
import { Terrain, Grass, MeadowLayer, Pond, StonePath, GardenProp } from '../3d/GardenProps';
import { Butterfly, Bird, FallingLeaf, FloatingText, Fireflies, FallingPetals, LeafExplosion, Clouds, ShootingStar, GodRays, Nebula, Aurora, SkyDome, HorizonGlow, CirrusClouds, MilkyWay, SkyColorBands } from '../3d/Environment';
import { CustomGLTFModel, DraggableItem, GameCameraController, MovementInput, SpawnIn } from './SceneHelpers';

type GardenTheme = (typeof THEMES)[keyof typeof THEMES];

type FloatingTextItem = { id: number; text: string; position: [number, number, number]; color: string };

type FlowerPlacement = { x: number; z: number; type: string; scale: number };
type GrassPlacement = { x: number; z: number };

type LoveTreeCanvasSceneProps = {
  graphicsQuality: 'low' | 'medium' | 'high';
  dpr: number;
  skyColor: string;
  hour: number;
  sunPosition: [number, number, number];
  treeStyle: string;
  theme: GardenTheme;
  petEmotion: Emotion;
  cameraMode: 'orbit' | 'explore';
  isEditMode: boolean;
  movement: MovementInput;
  purchasedItems: PurchasedItem[];
  activeLandId?: string;
  onUpdateItemPosition?: (id: string, update: ItemTransformUpdate) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  snapToGrid: boolean;
  growthScale: number;
  leaves: number;
  windFactor: number;
  branchCount: number;
  shakeTree: boolean;
  setShakeTree: React.Dispatch<React.SetStateAction<boolean>>;
  showExplosion: boolean;
  floatingTexts: FloatingTextItem[];
  pets: Array<{ id: string; type: string; name?: string }>;
  petType: string;
  flowerPositions: FlowerPlacement[];
  grassPositions: GrassPlacement[];
};

export const LoveTreeCanvasScene: React.FC<LoveTreeCanvasSceneProps> = ({
  graphicsQuality,
  dpr,
  skyColor,
  hour,
  sunPosition,
  treeStyle,
  theme,
  petEmotion,
  cameraMode,
  isEditMode,
  movement,
  purchasedItems,
  activeLandId,
  onUpdateItemPosition,
  selectedItemId,
  setSelectedItemId,
  snapToGrid,
  growthScale,
  leaves,
  windFactor,
  branchCount,
  shakeTree,
  setShakeTree,
  showExplosion,
  floatingTexts,
  pets,
  petType,
  flowerPositions,
  grassPositions,
}) => (
        <Canvas 
          shadows={graphicsQuality === 'high'}
          dpr={dpr}
          performance={{ min: 0.5 }}
          camera={{ position: [0, 6, 14], fov: 50 }}
          onPointerMissed={() => setSelectedItemId(null)}
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
  
          <GameCameraController enabled={cameraMode === 'explore' && !isEditMode} movement={movement} />
  
          <OrbitControls 
              makeDefault
              enabled={cameraMode === 'orbit'}
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
                <SpawnIn key="tree-edit" delay={0.6}>
                  <DraggableItem
                    item={fakeItem}
                    snapToGrid={snapToGrid}
                    onSelect={() => setSelectedItemId(null)}
                    onUpdate={async (id, update) => {
                      // If this is the placeholder fake item, create a real DB record first
                      if (!mainTreeItem && activeLandId) {
                        try {
                          await fetch('/api/purchased-items', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'main_tree', landId: activeLandId, x: update.x, y: 0, z: update.z })
                          });
                        } catch (e) { console.error('Failed to create main_tree item', e); }
                      } else if (onUpdateItemPosition) {
                        onUpdateItemPosition(id, update);
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
                 if (isEditMode) {
                   return (
                     <SpawnIn key={item.id} delay={2.0 + idx * 0.12}>
                       <DraggableItem
                         item={item}
                         onUpdate={onUpdateItemPosition}
                         onSelect={setSelectedItemId}
                         isSelected={selectedItemId === item.id}
                         snapToGrid={snapToGrid}
                         enabled={isEditMode}
                       >
                         <Pet3D emotion={petEmotion} theme={theme} petType={item.type} startPos={[0, 0, 0]} quality={graphicsQuality} />
                       </DraggableItem>
                     </SpawnIn>
                   );
                 }
                 return (
                   <SpawnIn key={item.id} delay={2.0 + idx * 0.12}>
                     <Pet3D emotion={petEmotion} theme={theme} petType={item.type} startPos={[item.x || 0, 0, item.z || 0]} quality={graphicsQuality} />
                   </SpawnIn>
                 );
              }
  
              return (
                 <SpawnIn key={item.id} delay={2.0 + idx * 0.12}>
                   <DraggableItem
                     item={item}
                     onUpdate={onUpdateItemPosition}
                     onSelect={setSelectedItemId}
                     isSelected={selectedItemId === item.id}
                     snapToGrid={snapToGrid}
                     enabled={isEditMode}
                   >
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
  
               <SpawnIn delay={1.22}>
                 <MeadowLayer theme={theme} windFactor={windFactor} quality={graphicsQuality} />
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
);
