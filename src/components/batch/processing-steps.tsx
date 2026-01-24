'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Circle, Search, Brain, Globe, Instagram, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export type ProcessingStep = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number; // in seconds
  icon?: React.ReactNode;
};

interface ProcessingStepsProps {
  steps: ProcessingStep[];
  currentStepIndex: number;
  elapsedTime?: number; // total elapsed time in seconds
  className?: string;
}

const defaultSteps: ProcessingStep[] = [
  { id: 'deep-dive', label: 'Deep Dive', status: 'pending', icon: <Search size={16} /> },
  { id: 'thinking', label: 'Thinking', status: 'pending', icon: <Brain size={16} /> },
  { id: 'exploring', label: 'Exploring the request', status: 'pending', icon: <Circle size={16} /> },
  { id: 'web-sources', label: 'Evaluating web sources', status: 'pending', icon: <Globe size={16} /> },
  { id: 'instagram', label: 'Scanning Instagram', status: 'pending', icon: <Instagram size={16} /> },
  { id: 'analyzing', label: 'Analyzing Content', status: 'pending', icon: <Play size={16} /> },
  { id: 'tiktok', label: 'Scanning TikTok', status: 'pending', icon: <TikTokIcon className="w-4 h-4" /> },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function StepItem({ step, isActive, isCompleted, duration }: {
  step: ProcessingStep;
  isActive: boolean;
  isCompleted: boolean;
  duration?: number;
}) {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setTimer(0);
      return;
    }

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div
      className={cn(
        'flex items-center gap-4 py-3 px-4 rounded-lg transition-all duration-300',
        isActive && 'bg-zinc-800/50',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Status icon */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center transition-all',
        isCompleted && 'bg-emerald-500/20',
        isActive && 'bg-blue-500/20',
        !isCompleted && !isActive && 'bg-zinc-800'
      )}>
        {isCompleted ? (
          <Check size={16} className="text-emerald-500" />
        ) : isActive ? (
          <Loader2 size={16} className="text-blue-400 animate-spin" />
        ) : (
          <span className={cn('text-zinc-600', step.icon ? '' : '')}>
            {step.icon || <Circle size={16} />}
          </span>
        )}
      </div>

      {/* Label & timer */}
      <div className="flex-1">
        <p className={cn(
          'text-sm transition-colors',
          isActive && 'text-zinc-100',
          isCompleted && 'text-zinc-400',
          !isCompleted && !isActive && 'text-zinc-600'
        )}>
          {step.label}
        </p>
        {(isActive || (isCompleted && duration)) && (
          <p className="text-xs text-zinc-600 mt-0.5">
            {isActive ? formatDuration(timer) : duration ? formatDuration(duration) : ''}
          </p>
        )}
      </div>

      {/* Animated dots for active step */}
      {isActive && (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProcessingSteps({
  steps = defaultSteps,
  currentStepIndex,
  elapsedTime,
  className,
}: ProcessingStepsProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {/* Header with total time */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Processing</span>
        {elapsedTime !== undefined && (
          <span className="text-xs text-zinc-600">
            Total: {formatDuration(elapsedTime)}
          </span>
        )}
      </div>

      {/* Steps list */}
      {steps.map((step, index) => (
        <StepItem
          key={step.id}
          step={step}
          isActive={index === currentStepIndex}
          isCompleted={index < currentStepIndex}
          duration={step.duration}
        />
      ))}

      {/* Progress bar at bottom */}
      <div className="mt-4 px-4">
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Hook to manage processing steps
export function useProcessingSteps(initialSteps?: ProcessingStep[]) {
  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps || defaultSteps);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const advanceStep = () => {
    if (currentIndex < steps.length - 1) {
      setSteps(prev => prev.map((step, i) =>
        i === currentIndex
          ? { ...step, status: 'completed' as const, duration: elapsedTime }
          : i === currentIndex + 1
          ? { ...step, status: 'active' as const }
          : step
      ));
      setCurrentIndex(prev => prev + 1);
    }
  };

  const completeAll = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })));
    setCurrentIndex(steps.length);
  };

  return { steps, currentIndex, elapsedTime, advanceStep, completeAll };
}
