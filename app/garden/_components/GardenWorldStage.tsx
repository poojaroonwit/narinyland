"use client";

import React from 'react';
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
  const {
    hasAcceptedProposal,
    configLoaded,
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

  React.useEffect(() => {
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
  }, [activeLandId, reloadKey]);

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
          />
        ) : (
          <HexWorld3D snapshot={snapshot} graphicsQuality={graphicsQuality} />
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
