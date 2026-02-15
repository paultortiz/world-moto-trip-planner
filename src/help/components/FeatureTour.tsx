"use client";

import { useHelpOptional } from "../HelpProvider";
import { getTour } from "../lib/tourDefinitions";
import { TourSpotlight } from "./TourSpotlight";
import { TourStepCard } from "./TourStepCard";

/**
 * Main tour component that renders the spotlight and step card
 * for the currently active tour.
 * 
 * This component reads tour state from the HelpProvider context
 * and renders the appropriate UI.
 * 
 * Usage: Add <FeatureTour /> to your app layout (inside HelpProvider)
 */
export function FeatureTour() {
  const helpContext = useHelpOptional();

  if (!helpContext) return null;

  const {
    activeTourId,
    activeTourStep,
    nextTourStep,
    prevTourStep,
    endTour,
  } = helpContext;

  // No active tour
  if (!activeTourId) return null;

  // Get tour definition
  const tour = getTour(activeTourId);
  if (!tour || tour.steps.length === 0) {
    // Invalid tour - end it
    endTour();
    return null;
  }

  // Get current step
  const currentStep = tour.steps[activeTourStep];
  if (!currentStep) {
    // Step index out of bounds - end tour
    endTour();
    return null;
  }

  const isLastStep = activeTourStep >= tour.steps.length - 1;

  return (
    <>
      {/* Spotlight overlay */}
      <TourSpotlight
        targetSelector={currentStep.targetSelector}
        padding={currentStep.highlightPadding ?? 8}
        isActive={true}
        onBackdropClick={endTour}
      />

      {/* Step card */}
      <TourStepCard
        step={currentStep}
        stepIndex={activeTourStep}
        totalSteps={tour.steps.length}
        onNext={nextTourStep}
        onPrev={prevTourStep}
        onSkip={endTour}
        isLastStep={isLastStep}
      />
    </>
  );
}
