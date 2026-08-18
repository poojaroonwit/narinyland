"use client";

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import FamilyFarm2D from '../../../components/family-farm/FamilyFarm2D';
import ProposalScreen from '../../../components/ProposalScreen';
import { useGardenPageContext } from './context';

type GardenLandSummary = {
  id: string;
  name: string;
  isActive?: boolean;
};

type CircleSummary = {
  id: string;
  name: string;
};

export const GardenWorldStage: React.FC = () => {
  const {
    activeCircleId,
    circles,
    hasAcceptedProposal,
    configLoaded,
    appConfig,
    activePartners,
    handleProposalAccepted,
    handleProposalStepChange,
    showToast,
  } = useGardenPageContext();

  const lands = (appConfig.lands || []) as GardenLandSummary[];
  const circleList = (circles || []) as CircleSummary[];
  const activeLand = lands.find((land) => land.isActive) ?? lands[0];
  const circleName = circleList.find((circle) => circle.id === activeCircleId)?.name || appConfig.appName;

  return (
    <>
      <div className="fixed inset-0 z-0 overflow-y-auto">
        <FamilyFarm2D
          activeCircleId={activeCircleId}
          activeLandId={activeLand?.id}
          activeLandName={activeLand?.name}
          circleName={circleName}
          partners={activePartners}
          onToast={showToast}
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
