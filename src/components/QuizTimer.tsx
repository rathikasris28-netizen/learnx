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
    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
      isUrgent 
        ? 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse' 
        : 'bg-blue-50 border-blue-200 text-blue-700'
    }`}>
      <Clock className="h-4 w-4 shrink-0" />
      <span>
        Time Remaining: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
