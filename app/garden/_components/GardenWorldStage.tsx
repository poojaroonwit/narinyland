"use client";

import React from 'react';
import { useAuth } from '../../../components/AuthProvider';
import { AnimatePresence } from 'framer-motion';
import ProposalScreen from '../../../components/ProposalScreen';
import { HexBuildController } from '../../../components/hex-world/HexBuildController';
import { HexWorld3D } from '../../../components/hex-world/HexWorld3D';
import { HexWorldLoading } from '../../../components/hex-world/HexWorldLoading';
import { hexWorldAPI } from '../../../services/hex-world-api';
import type { HexWorldSnapshot } from '../../../lib/hex-world/types';
import type { Land } from '../../../types';
import { useGardenPageContext } from './context';

export const GardenWorldStage: React.FC = () => {
  const { activeCircleId } = useAuth();
  const {
    hasAcceptedProposal,
    configLoaded,
    configLoadError,
    retryConfigLoad,
    appConfig,
    handleProposalAccepted,
    handleProposalStepChange,
    showToast,
  } = useGardenPageContext();

  const lands = (appConfig.lands || []) as Land[];
  const activeLand = lands.find((land) => land.isActive) ?? lands[0];
  const activeLandId = activeLand?.id;
  const graphicsQuality = (appConfig as { graphicsQuality?: string }).graphicsQuality ?? 'medium';
  const [snapshot, setSnapshot] = React.useState<HexWorldSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [storyLanternCount, setStoryLanternCount] = React.useState(0);

  React.useEffect(() => {
    setStoryLanternCount(0);
    if (!activeCircleId) return;
    const controller = new AbortController();
    fetch('/api/couple-world/quests', {
      cache: 'no-store',
      headers: { 'X-Circle-Id': activeCircleId },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { completedMoments?: number } | null) => {
        if (!controller.signal.aborted && typeof data?.completedMoments === 'number') {
          setStoryLanternCount(data.completedMoments);
        }
      })
      .catch(() => {}); // Decorative story lanterns never block entry into the world.

    const onStoryUpdated = (event: Event) => {
      const data = (event as CustomEvent<{ circleId: string; completedMoments: number }>).detail;
      if (data?.circleId === activeCircleId && Number.isFinite(data.completedMoments)) {
        setStoryLanternCount(data.completedMoments);
      }
    };
    window.addEventListener('narinyland:couple-stories-updated', onStoryUpdated);
    return () => {
      controller.abort();
      window.removeEventListener('narinyland:couple-stories-updated', onStoryUpdated);
    };
  }, [activeCircleId]);

  React.useEffect(() => {
    if (!configLoaded) {
      setSnapshot(null);
      setError(null);
      return;
    }
    if (!activeLandId) {
      setSnapshot(null);
      setError('No active Land is available yet.');
      return;
    }

    const controller = new AbortController();
    let current = true;
    setSnapshot(null);
    setError(null);

    hexWorldAPI.get(activeLandId, controller.signal)
      .then((next) => {
        if (!current || controller.signal.aborted) return;
        setSnapshot(next);
      })
      .catch((loadError: unknown) => {
        if (!current || controller.signal.aborted || (loadError as { name?: string })?.name === 'AbortError') return;
        console.error('Failed to load floating HexWorld', loadError);
        setError(loadError instanceof Error ? loadError.message : 'Could not load this Land.');
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [activeLandId, reloadKey, configLoaded]);

  if (!configLoaded) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#f7f1e6] px-5" role="status">
        <div className="cozy-surface w-full max-w-sm rounded-[1.5rem] p-6 text-center">
          <div aria-hidden="true" className="mb-3 text-3xl">🌿</div>
          <h1 className="text-lg font-semibold text-stone-800">{configLoadError ? 'Could not open your world' : 'Opening your world…'}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {configLoadError ? 'Your saved memories are safe. Please check your connection and retry.' : 'Loading your shared garden and memories.'}
          </p>
          {configLoadError && (
            <button type="button" onClick={retryConfigLoad} className="cozy-button-primary mt-5 min-h-11 rounded-xl px-5 text-sm font-semibold">
              Retry loading
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-0">
        {!snapshot ? (
          <HexWorldLoading error={error} onRetry={() => setReloadKey((value) => value + 1)} />
        ) : hasAcceptedProposal ? (
          <HexBuildController
            landId={snapshot.world.landId}
            snapshot={snapshot}
            setSnapshot={setSnapshot}
            showToast={showToast}
            graphicsQuality={graphicsQuality}
            storyLanternCount={storyLanternCount}
          />
        ) : (
          <HexWorld3D snapshot={snapshot} graphicsQuality={graphicsQuality} storyLanternCount={storyLanternCount} />
        )}
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
