import { useState, useEffect, useMemo, useCallback } from 'react';
import { AudioManager } from './services/audioManager';
import { VisualizerScene } from './components/VisualizerScene';
import { Controls } from './components/Controls';
import { PerformerOverlay } from './components/PerformerOverlay';
import { AudioSourceType, VisualMode } from './types';

const FONTS = [
    '"Space Mono", monospace', 
    '"Orbitron", sans-serif', 
    '"Rajdhani", sans-serif', 
    '"Syncopate", sans-serif', 
    '"Bungee Outline", cursive',
    '"Press Start 2P", cursive',
    '"Inter", sans-serif'
];

function App() {
  // --- State ---
  const [isInitialized, setIsInitialized] = useState(false);
  const [sourceType, setSourceType] = useState<AudioSourceType>(AudioSourceType.MICROPHONE);
  const [visualMode, setVisualMode] = useState<VisualMode>(VisualMode.FLUID);
  const [performerName, setPerformerName] = useState<string>('');
  const [additionalTexts, setAdditionalTexts] = useState<string[]>([]);
  const [sensitivity, setSensitivity] = useState<number>(1.2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Performance Settings
  const [isHighQuality, setIsHighQuality] = useState<boolean>(false);

  // Auto Cycle State
  const [isAutoCycle, setIsAutoCycle] = useState<boolean>(false);
  // Default to all modes
  const [cycleModes, setCycleModes] = useState<VisualMode[]>(Object.values(VisualMode));

  // Appearance State
  const [primaryColor, setPrimaryColor] = useState<string>('#00ffff'); // Name Color
  const [secondaryColor, setSecondaryColor] = useState<string>('#8a2be2'); // Visuals Color
  const [fontFamily, setFontFamily] = useState<string>(FONTS[0]);
  const [isAutoRandomColor, setIsAutoRandomColor] = useState<boolean>(false);

  // Audio Settings
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);

  // --- Service ---
  const audioManager = useMemo(() => new AudioManager(), []);

  // Compute the list of messages for the overlay
  const overlayMessages = useMemo(() => {
    const list: string[] = [];
    if (performerName.trim()) list.push(performerName);
    return [...list, ...additionalTexts];
  }, [performerName, additionalTexts]);

  // --- Auto Cycle Logic ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isAutoCycle && cycleModes.length > 1) {
      interval = setInterval(() => {
        setVisualMode(prev => {
          // Filter modes that are currently in the cycle pool
          // If the current mode is in the pool, find the next one.
          // If not, pick a random one from the pool.
          
          const currentIndex = cycleModes.indexOf(prev);
          
          if (currentIndex !== -1) {
              // Move to next in array, wrapping around
              return cycleModes[(currentIndex + 1) % cycleModes.length];
          } else {
              // Current mode not in cycle pool, start from first allowed
              return cycleModes[0];
          }
        });
      }, 10000); // Switch every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoCycle, cycleModes]);

  // --- Handlers ---
  const handleRandomizeAppearance = useCallback(() => {
    // Helper to generate a hex color from HSL
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };

    // 1. Generate a random base Hue (0-360)
    const baseHue = Math.floor(Math.random() * 360);
    
    // 2. Generate a contrasting Hue (180 degrees offset +/- randomness)
    // This creates a complementary color scheme (e.g. Blue & Orange, Red & Green)
    const contrastHue = (baseHue + 180 + (Math.random() * 60 - 30)) % 360;

    // 3. Generate Colors
    // Ensure high saturation (80-100%) and good lightness (50-70%) so they pop against black
    const s = 80 + Math.random() * 20;
    const l = 50 + Math.random() * 20;

    const color1 = hslToHex(baseHue, s, l);
    const color2 = hslToHex(contrastHue, s, l);

    // 4. Randomly assign which is Text vs Visuals
    if (Math.random() > 0.5) {
        setPrimaryColor(color1);   // Text
        setSecondaryColor(color2); // Visuals
    } else {
        setPrimaryColor(color2);
        setSecondaryColor(color1);
    }
    
    // Random Font
    const randomFont = FONTS[Math.floor(Math.random() * FONTS.length)];
    setFontFamily(randomFont);
  }, []);

  // --- Auto Random Appearance Logic ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAutoRandomColor) {
        interval = setInterval(handleRandomizeAppearance, 2000); // 2 seconds (Electro tempo friendly)
    }
    return () => clearInterval(interval);
  }, [isAutoRandomColor, handleRandomizeAppearance]);

  const handleSourceChange = async (type: AudioSourceType) => {
    try {
        setErrorMsg(null);
        setSourceType(type);
        
        let nextMonitorState = false;

        if (type === AudioSourceType.SYSTEM_FILE) {
             nextMonitorState = true;
        } else if (type === AudioSourceType.MICROPHONE) {
             nextMonitorState = false;
        } else if (type === AudioSourceType.BROWSER_TAB) {
             nextMonitorState = false;
        }
        
        setIsMonitoring(nextMonitorState);

        if (type !== AudioSourceType.SYSTEM_FILE) {
            await audioManager.setSource(type, undefined, nextMonitorState);
        }
        
        setIsInitialized(true);

    } catch (err: any) {
        console.warn("Source change interrupted:", err.message);

        let msg = "Failed to access audio source.";
        
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
            msg = "Access denied. Please check your browser permissions.";
        } else if (err.name === 'NotFoundError') {
             msg = "No audio input device found.";
        } else if (err.message.includes('No audio track')) {
             msg = "No audio detected. Did you check 'Share Audio' in the browser dialog?";
        }

        setErrorMsg(msg);
    }
  };

  const handleFileUpload = async (file: File) => {
      try {
          setErrorMsg(null);
          await audioManager.setSource(AudioSourceType.SYSTEM_FILE, file, isMonitoring);
          if (!isInitialized) setIsInitialized(true);
      } catch (err: any) {
          console.error("File upload error", err);
          setErrorMsg("Failed to play file.");
      }
  };

  useEffect(() => {
    audioManager.setMonitor(isMonitoring);
  }, [isMonitoring, audioManager]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
      return () => {
          audioManager.stop();
      };
  }, [audioManager]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans" style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#000', color: '#fff' }}>
      
      {/* 1. Visualizer Canvas (Background) */}
      <div className="absolute inset-0 z-0" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
         <VisualizerScene 
            audioManager={audioManager} 
            mode={visualMode}
            sensitivity={sensitivity}
            color={secondaryColor}
            isHighQuality={isHighQuality}
         />
      </div>

      {/* 2. Overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}>
        <PerformerOverlay messages={overlayMessages} color={primaryColor} fontFamily={fontFamily} />
      </div>

      {/* 3. Error Toast */}
      {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-xl border border-red-500 backdrop-blur-sm flex items-center gap-3 animate-fade-in-down" style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
              <span className="font-medium text-sm">{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-2 hover:bg-white/20 rounded p-1 transition-colors">
                  X
              </button>
          </div>
      )}

      {/* 4. Start Prompt (If not initialized) */}
      {!isInitialized && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <h1 className="font-['Space_Mono'] text-4xl mb-8 font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500" style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#00ffff' }}>
                GT2-PRISM
            </h1>
            
            <div className="flex flex-col md:flex-row gap-4 p-4">
                <button 
                    onClick={() => handleSourceChange(AudioSourceType.MICROPHONE)}
                    className="group relative px-8 py-4 bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-600 hover:border-cyan-400 text-white font-bold text-lg tracking-widest rounded-xl transition-all duration-300 overflow-hidden"
                    style={{ padding: '1rem 2rem', margin: '0.5rem', border: '1px solid #06b6d4', borderRadius: '0.75rem', backgroundColor: 'rgba(22, 78, 99, 0.5)', cursor: 'pointer', color: 'white' }}
                >
                    MICROPHONE
                </button>

                <button 
                    onClick={() => handleSourceChange(AudioSourceType.BROWSER_TAB)}
                    className="group relative px-8 py-4 bg-purple-900/30 border border-purple-500/50 hover:bg-purple-600 hover:border-purple-400 text-white font-bold text-lg tracking-widest rounded-xl transition-all duration-300 overflow-hidden"
                    style={{ padding: '1rem 2rem', margin: '0.5rem', border: '1px solid #a855f7', borderRadius: '0.75rem', backgroundColor: 'rgba(88, 28, 135, 0.5)', cursor: 'pointer', color: 'white' }}
                >
                    SYSTEM AUDIO
                </button>
                
                 <button 
                    onClick={() => handleSourceChange(AudioSourceType.SYSTEM_FILE)}
                    className="group relative px-8 py-4 bg-gray-800/30 border border-gray-500/50 hover:bg-gray-600 hover:border-gray-400 text-white font-bold text-lg tracking-widest rounded-xl transition-all duration-300 overflow-hidden"
                    style={{ padding: '1rem 2rem', margin: '0.5rem', border: '1px solid #6b7280', borderRadius: '0.75rem', backgroundColor: 'rgba(31, 41, 55, 0.5)', cursor: 'pointer', color: 'white' }}
                >
                    UPLOAD FILE
                </button>
            </div>
            
            <p className="mt-8 text-white/40 text-sm max-w-md text-center" style={{ marginTop: '2rem', color: '#aaa' }}>
                Select an audio source to begin.
            </p>
        </div>
      )}

      {/* 5. UI Controls */}
      <div style={{ position: 'relative', zIndex: 50 }}>
          <Controls 
            sourceType={sourceType}
            setSourceType={handleSourceChange}
            visualMode={visualMode}
            setVisualMode={setVisualMode}
            performerName={performerName}
            setPerformerName={setPerformerName}
            additionalTexts={additionalTexts}
            setAdditionalTexts={setAdditionalTexts}
            sensitivity={sensitivity}
            setSensitivity={setSensitivity}
            onFileUpload={handleFileUpload}
            toggleFullscreen={toggleFullscreen}
            primaryColor={primaryColor}
            setPrimaryColor={setPrimaryColor}
            secondaryColor={secondaryColor}
            setSecondaryColor={setSecondaryColor}
            onManualRandomize={handleRandomizeAppearance}
            isAutoRandomColor={isAutoRandomColor}
            setIsAutoRandomColor={setIsAutoRandomColor}
            isMonitoring={isMonitoring}
            setIsMonitoring={setIsMonitoring}
            isAutoCycle={isAutoCycle}
            setIsAutoCycle={setIsAutoCycle}
            cycleModes={cycleModes}
            setCycleModes={setCycleModes}
            isHighQuality={isHighQuality}
            setIsHighQuality={setIsHighQuality}
          />
      </div>
      
      {/* Watermark/Credit (Small) */}
      <div className="fixed bottom-1 right-2 text-[10px] text-white/20 pointer-events-none z-0" style={{ position: 'fixed', bottom: '4px', right: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
          GT2-PRISM 1.0 // 60FPS
      </div>
    </div>
  );
}

export default App;