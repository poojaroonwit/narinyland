"use client";

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import FamilyFarm2D from '../../../components/family-farm/FamilyFarm2D';
import ProposalScreen from '../../../components/ProposalScreen';
import { useGardenPageContext } from './context';

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

  const activeLand = appConfig.lands?.find((land) => land.isActive) ?? appConfig.lands?.[0];
  const circleName = circles.find((circle) => circle.id === activeCircleId)?.name || appConfig.appName;

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
