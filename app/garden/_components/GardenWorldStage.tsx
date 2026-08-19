"use client";

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import LoveTree3D from '../../../components/LoveTree3D';
import ProposalScreen from '../../../components/ProposalScreen';
import type { ShopItem } from '../../../components/Shop';
import { purchasedItemsAPI } from '../../../services/api';
import type { ItemTransformUpdate, Land } from '../../../types';
import { useGardenPageContext } from './context';

export const GardenWorldStage: React.FC = () => {
  const {
    hasAcceptedProposal,
    configLoaded,
    appConfig,
    petEmotion,
    petMessage,
    loveStats,
    isEditMode,
    setIsEditMode,
    setLoveStats,
    setAppConfig,
    handleAddLeaf,
    handleProposalAccepted,
    handleProposalStepChange,
    showToast,
  } = useGardenPageContext();

  const lands = (appConfig.lands || []) as Land[];
  const activeLand = lands.find((land) => land.isActive) ?? lands[0];

  const handleUpdateItemPosition = async (itemId: string, update: ItemTransformUpdate) => {
    const landId = activeLand?.id;
    if (!landId) return;

    const { x, y, z, rotation } = update;

    try {
      if (itemId === 'main_tree') {
        const newItem = await purchasedItemsAPI.create({
          type: 'main_tree',
          landId,
          x,
          y,
          z,
          ...(rotation !== undefined ? { rotation } : {}),
        });

        setAppConfig((previous: typeof appConfig) => ({
          ...previous,
          lands: previous.lands?.map((land: Land) => (
            land.id === landId
              ? { ...land, items: [...(land.items || []), newItem] }
              : land
          )),
        }));
        return;
      }

      setAppConfig((previous: typeof appConfig) => ({
        ...previous,
        lands: previous.lands?.map((land: Land) => (
          land.id === landId
            ? {
                ...land,
                items: land.items?.map((item) => (
                  item.id === itemId
                    ? {
                        ...item,
                        x,
                        y,
                        z,
                        ...(rotation !== undefined ? { rotation } : {}),
                      }
                    : item
                )),
              }
            : land
        )),
      }));

      await purchasedItemsAPI.update(itemId, {
        x,
        y,
        z,
        ...(rotation !== undefined ? { rotation } : {}),
      });
    } catch (error) {
      console.error('Failed to update 3D garden item position', error);
      showToast('Could not move this garden item. Please try again.');
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    const landId = activeLand?.id;
    if (!landId) return;

    setLoveStats((previous: typeof loveStats) => ({
      ...previous,
      points: previous.points - item.price,
    }));

    try {
      const newItem = await purchasedItemsAPI.create({
        type: item.type,
        landId,
        modelUrl: item.modelUrl,
      });

      setAppConfig((previous: typeof appConfig) => ({
        ...previous,
        lands: previous.lands?.map((land: Land) => (
          land.id === landId
            ? { ...land, items: [...(land.items || []), newItem] }
            : land
        )),
      }));
      showToast(`You bought a ${item.name}! 🛍️`);
    } catch (error) {
      console.error('Purchase error', error);
      setLoveStats((previous: typeof loveStats) => ({
        ...previous,
        points: previous.points + item.price,
      }));
      showToast('Purchase failed. Please try again.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-0">
        <LoveTree3D
          anniversaryDate={appConfig.anniversaryDate}
          treeStyle={appConfig.treeStyle}
          petEmotion={petEmotion}
          petMessage={petMessage}
          level={loveStats.level}
          daysPerTree={appConfig.daysPerTree}
          daysPerFlower={appConfig.daysPerFlower}
          flowerType={appConfig.flowerType}
          mixedFlowers={appConfig.mixedFlowers}
          leaves={loveStats.leaves}
          points={loveStats.points}
          skyMode={appConfig.skyMode}
          showQRCode={appConfig.showQRCode}
          petType={appConfig.petType}
          pets={appConfig.pets}
          albums={appConfig.albums}
          graphicsQuality={appConfig.graphicsQuality}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          onAddLeaf={handleAddLeaf}
          purchasedItems={activeLand?.items || []}
          onUpdateItemPosition={handleUpdateItemPosition}
          activeLandId={activeLand?.id}
          onPurchase={handlePurchase}
        />
      </div>

      <AnimatePresence>
        {configLoaded && appConfig.showProposal && !hasAcceptedProposal && (
          <ProposalScreen
            onAccept={handleProposalAccepted}
            onStepChange={handleProposalStepChange}
            questions={appConfig.proposal}
            appName={appConfig.appName}
          />
        )}
      </AnimatePresence>
    </>
  );
};
