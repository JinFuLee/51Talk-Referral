'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
}

export function TypewriterText({ text, speed = 30, className, delay = 0 }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let index = 0;
    setDisplayedText('');

    const startTyping = () => {
      setIsTyping(true);
      const interval = setInterval(() => {
        setDisplayedText((prev) => text.substring(0, index + 1));
        index++;
        if (index >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);

      return interval;
    };

    let intervalId: NodeJS.Timeout;
    const timeoutId = setTimeout(() => {
      intervalId = startTyping();
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, delay]);

  return (
    <span className={cn('relative whitespace-pre-wrap', className)}>
      {displayedText}
      {isTyping && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-action-active animate-pulse align-middle" />
      )}
    </span>
  );
}
