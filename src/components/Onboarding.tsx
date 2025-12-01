'use client';

import { useState, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to Gig Finder",
    description: "Help your Whop community members discover freelance opportunities from multiple platforms in one place.",
  },
  {
    title: "One Search, Four Platforms",
    description: "We aggregate gigs from Freelancer, Upwork, RemoteOK, and WeWorkRemotely—so your members don't have to.",
  },
  {
    title: "Built for Your Community",
    description: "Embed this directly in your Whop. Members get instant access to fresh opportunities without leaving your hub.",
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const posthog = usePostHog();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    posthog?.capture('onboarding_started');
    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      posthog?.capture('onboarding_step_completed', { 
        step: currentStep + 1,
        step_title: steps[currentStep].title,
      });
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    posthog?.capture('onboarding_completed', {
      completed_at_step: currentStep + 1,
      total_steps: steps.length,
      skipped: currentStep < steps.length - 1,
    });
    setTimeout(() => {
      localStorage.setItem('gig-finder-onboarded', 'true');
      onComplete();
    }, 300);
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className={`onboarding-overlay ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}>
      <div className="onboarding-backdrop" />
      
      <div className="onboarding-modal">
        <button className="onboarding-close" onClick={handleComplete} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="onboarding-body" key={currentStep}>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-description">{step.description}</p>
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {steps.map((_, index) => (
              <span
                key={index}
                className={`onboarding-dot ${index === currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          <button className="onboarding-action" onClick={handleNext}>
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
