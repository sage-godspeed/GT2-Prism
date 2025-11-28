import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AudioManager } from './services/audioManager';
import { VisualizerScene } from './components/VisualizerScene';
import { Controls } from './components/Controls';
import { PerformerOverlay } from './components/PerformerOverlay';
import { AudioSourceType, VisualMode } from './types';

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
  const handleSourceChange = async (type: AudioSourceType) => {
    try {
        setErrorMsg(null);
        setSourceType(type);
        
        // SAFETY: Prevent feedback loops by defaulting defaults intelligently
        let nextMonitorState = false;

        if (type === AudioSourceType.SYSTEM_FILE) {
             // We generally want to hear files we play
             nextMonitorState = true;
        } else if (type === AudioSourceType.MICROPHONE) {
             // ALWAYS default to OFF for mic to prevent feedback loop
             nextMonitorState = false;
        } else if (type === AudioSourceType.BROWSER_TAB) {
             // Default off to avoid echo (browser handles playback)
             nextMonitorState = false;
        }
        
        setIsMonitoring(nextMonitorState);

        // For file type, we don't start immediately, we wait for upload in Controls. 
        if (type !== AudioSourceType.SYSTEM_FILE) {
            await audioManager.setSource(type, undefined, nextMonitorState);
        }
        
        // If we successfully set a source (or selected file mode), we are initialized
        setIsInitialized(true);

    } catch (err: any) {
        // Log as warning to avoid cluttering console with expected errors
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
        
        // If we failed to initialize, we stay in uninitialized state (Splash Screen)
        // If we were already initialized, we stay initialized but show error toast
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

  // Update audio monitor dynamically when checkbox changes
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
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      
      {/* 1. Visualizer Canvas (Background) */}
      <div className="absolute inset-0 z-0">
         <VisualizerScene 
            audioManager={audioManager} 
            mode={visualMode}
            sensitivity={sensitivity}
            color={secondaryColor}
            isHighQuality={isHighQuality}
         />
      </div>

      {/* 2. Overlays */}
      <PerformerOverlay messages={overlayMessages} color={primaryColor} />

      {/* 3. Error Toast */}
      {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-xl border border-red-500 backdrop-blur-sm flex items-center gap-3 animate-fade-in-down">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span className="font-medium text-sm">{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="ml-2 hover:bg-white/20 rounded p-1 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
          </div>
      )}

      {/* 4. Start Prompt (If not initialized) */}
      {!isInitialized && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <h1 className="font-['Space_Mono'] text-4xl mb-8 font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                GT2-PRISM
            </h1>
            
            <div className="flex flex-col md:flex-row gap-4 p-4">
                <button 
                    onClick={() => handleSourceChange(AudioSourceType.MICROPHONE)}
                    className="group relative px-8 py-4 bg-cyan-900/30 border border-cyan-500/50 hover:bg-cyan-600 hover:border-cyan-400 text-white font-bold text-lg tracking-widest rounded-xl transition-all duration-300 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        MICROPHONE
                    </span>
                </button>

                <button 
                    onClick={() => handleSourceChange(AudioSourceType.BROWSER_TAB)}
                    className="group relative px-8 py-4 bg-purple-900/30 border border-purple-500/50 hover:bg-purple-600 hover:border-purple-400 text-white font-bold text-lg tracking-widest rounded-xl transition-all duration-300 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        SYSTEM AUDIO
                    </span>
                </button>
                
                 <button 
                    onClick={() => handleSourceChange(AudioSourceType.SYSTEM_FILE)}
                    className="group relative px-8 py-4 bg-gray-800/30 border border-gray-500/50 hover:bg-gray-600 hover:border-gray-400 text-white font-bold text-lg tracking-widest rounded-xl transition-all duration-300 overflow-hidden"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        UPLOAD FILE
                    </span>
                </button>
            </div>
            
            <p className="mt-8 text-white/40 text-sm max-w-md text-center">
                Select an audio source to begin. For System Audio, choose the tab sharing option in your browser.
            </p>
        </div>
      )}

      {/* 5. UI Controls */}
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
        isMonitoring={isMonitoring}
        setIsMonitoring={setIsMonitoring}
        isAutoCycle={isAutoCycle}
        setIsAutoCycle={setIsAutoCycle}
        cycleModes={cycleModes}
        setCycleModes={setCycleModes}
        isHighQuality={isHighQuality}
        setIsHighQuality={setIsHighQuality}
      />
      
      {/* Watermark/Credit (Small) */}
      <div className="fixed bottom-1 right-2 text-[10px] text-white/20 pointer-events-none z-0">
          GT2-PRISM 1.0 // 60FPS
      </div>
    </div>
  );
}

export default App;