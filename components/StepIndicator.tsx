
import React from 'react';
import type { AppStep } from '../types';

interface StepIndicatorProps {
  currentStep: AppStep;
  stepNames: string[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, stepNames }) => {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center">
        {stepNames.map((step, index) => {
          const isActive = index <= currentStep;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {index < currentStep ? '✔' : index + 1}
                </div>
                <p className={`mt-2 text-xs text-center ${isActive ? 'text-white' : 'text-gray-500'}`}>{step}</p>
              </div>
              {index < stepNames.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                    index < currentStep ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
