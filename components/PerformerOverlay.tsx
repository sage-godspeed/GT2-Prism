import React, { useEffect, useState, useRef } from 'react';

interface PerformerOverlayProps {
  messages: string[];
  color: string;
}

type AnimationState = 'hidden' | 'fade-in' | 'steady' | 'rave' | 'fade-out';

export const PerformerOverlay: React.FC<PerformerOverlayProps> = ({ messages, color }) => {
  const [animState, setAnimState] = useState<AnimationState>('hidden');
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Use ref to access latest messages in timeout closures without restarting the effect loop
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isRunning = true;

    const runSequence = () => {
        if (!isRunning) return;

        // Filter out empty lines
        const pool = messagesRef.current.filter(m => m.trim().length > 0);
        
        if (pool.length === 0) {
            setAnimState('hidden');
            // Check again in 2 seconds if data has appeared
            timeout = setTimeout(runSequence, 2000); 
            return;
        }

        // Pick a random message
        const nextMsg = pool[Math.floor(Math.random() * pool.length)];
        setCurrentMessage(nextMsg);

        // --- Sequence Start ---
        setAnimState('fade-in');
        
        timeout = setTimeout(() => {
            if (!isRunning) return;
            setAnimState('steady');
            
            timeout = setTimeout(() => {
                if (!isRunning) return;
                setAnimState('rave');
                
                timeout = setTimeout(() => {
                    if (!isRunning) return;
                    setAnimState('fade-out');
                    
                    timeout = setTimeout(() => {
                        if (!isRunning) return;
                        setAnimState('hidden');
                        
                        // Random delay before next message
                        const delay = Math.random() * 5000 + 2000; 
                        timeout = setTimeout(runSequence, delay);
                    }, 2000); // fade out duration
                }, 4000); // rave duration
            }, 2000); // steady duration
        }, 3000); // fade in duration
    };

    runSequence();

    return () => {
        isRunning = false;
        clearTimeout(timeout);
    };
  }, []);

  if (animState === 'hidden') return null;

  // Use the color prop in the keyframes
  const styles = `
    @keyframes glitch {
      0% { clip-path: inset(40% 0 61% 0); transform: translate(-2px, 2px); }
      20% { clip-path: inset(92% 0 1% 0); transform: translate(2px, -2px); }
      40% { clip-path: inset(43% 0 1% 0); transform: translate(-2px, 2px); }
      60% { clip-path: inset(25% 0 58% 0); transform: translate(2px, -2px); }
      80% { clip-path: inset(54% 0 7% 0); transform: translate(-2px, 2px); }
      100% { clip-path: inset(58% 0 43% 0); transform: translate(2px, -2px); }
    }
    @keyframes rgbShift {
      0% { text-shadow: -2px 0 ${color}, 2px 0 #ffffff; }
      25% { text-shadow: 2px 0 ${color}, -2px 0 #ffffff; }
      50% { text-shadow: -2px 0 #ffffff, 2px 0 ${color}; }
      75% { text-shadow: 2px 0 ${color}, -2px 0 #ffffff; }
      100% { text-shadow: -2px 0 #ffffff, 2px 0 ${color}; }
    }
    .rave-text {
      color: ${color};
      animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite, rgbShift 0.2s steps(2) infinite;
    }
    .steady-text {
      color: ${color};
      text-shadow: 0 0 15px ${color};
    }
    .fade-in { transition: opacity 2s ease-in, transform 2s ease-out; opacity: 1; transform: scale(1); filter: blur(0px); color: ${color}; }
    .fade-out { transition: opacity 1.5s ease-out, transform 1.5s ease-in; opacity: 0; transform: scale(1.2); filter: blur(20px); color: ${color}; }
  `;

  const getClassName = () => {
      switch (animState) {
          case 'fade-in': return 'opacity-100 scale-100 blur-0 transition-all duration-[3000ms] ease-out';
          case 'steady': return 'opacity-100 scale-105 steady-text transition-transform duration-[2000ms]';
          case 'rave': return 'rave-text font-black scale-110 drop-shadow-[0_0_25px_rgba(255,255,255,0.5)]';
          case 'fade-out': return 'opacity-0 scale-125 blur-xl transition-all duration-[2000ms] ease-in';
          default: return 'opacity-0';
      }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 overflow-hidden mix-blend-screen p-8">
        <h1 
          className={`font-['Space_Mono'] font-bold text-6xl md:text-8xl lg:text-9xl tracking-widest uppercase text-center select-none whitespace-pre-wrap max-w-[90vw] ${getClassName()}`}
          style={{ color: animState === 'rave' ? undefined : color }}
        >
          {currentMessage}
        </h1>
      </div>
    </>
  );
};