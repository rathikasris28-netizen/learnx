import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface QuizTimerProps {
  durationMinutes: number;
  onTimeExpired: () => void;
}

export function QuizTimer({ durationMinutes, onTimeExpired }: QuizTimerProps) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(durationMinutes * 60);

  useEffect(() => {
    if (timeLeftSeconds <= 0) {
      onTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds, onTimeExpired]);

  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const isUrgent = timeLeftSeconds <= 60; // Less than 1 minute remaining

  return (
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors shadow-xs ${
      isUrgent 
        ? 'bg-rose-950/50 border-rose-800/60 text-rose-300 animate-pulse' 
        : 'bg-[#123A8C]/25 border-[#4169E1]/40 text-blue-200'
    }`}>
      <Clock className="h-4 w-4 shrink-0 text-[#4169E1]" />
      <span>
        Time Remaining: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
