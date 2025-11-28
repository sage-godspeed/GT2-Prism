import React, { useState } from 'react';
import { AudioSourceType, VisualMode } from '../types';

interface ControlsProps {
  sourceType: AudioSourceType;
  setSourceType: (type: AudioSourceType) => void;
  visualMode: VisualMode;
  setVisualMode: (mode: VisualMode) => void;
  performerName: string;
  setPerformerName: (name: string) => void;
  additionalTexts: string[];
  setAdditionalTexts: (texts: string[]) => void;
  sensitivity: number;
  setSensitivity: (val: number) => void;
  onFileUpload: (file: File) => void;
  toggleFullscreen: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
  isMonitoring: boolean;
  setIsMonitoring: (val: boolean) => void;
  isAutoCycle: boolean;
  setIsAutoCycle: (val: boolean) => void;
  cycleModes: VisualMode[];
  setCycleModes: (modes: VisualMode[]) => void;
  isHighQuality: boolean;
  setIsHighQuality: (val: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  sourceType,
  setSourceType,
  visualMode,
  setVisualMode,
  performerName,
  setPerformerName,
  additionalTexts,
  setAdditionalTexts,
  sensitivity,
  setSensitivity,
  onFileUpload,
  toggleFullscreen,
  primaryColor,
  setPrimaryColor,
  secondaryColor,
  setSecondaryColor,
  isMonitoring,
  setIsMonitoring,
  isAutoCycle,
  setIsAutoCycle,
  cycleModes,
  setCycleModes,
  isHighQuality,
  setIsHighQuality
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isCycleConfigOpen, setIsCycleConfigOpen] = useState(false);

  const handleAddText = () => {
    if (inputText.trim()) {
      setAdditionalTexts([...additionalTexts, inputText.trim()]);
      setInputText('');
    }
  };

  const handleRemoveText = (index: number) => {
    const newTexts = [...additionalTexts];
    newTexts.splice(index, 1);
    setAdditionalTexts(newTexts);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddText();
      }
  };

  const toggleCycleMode = (mode: VisualMode) => {
      if (cycleModes.includes(mode)) {
          // Prevent removing the last one
          if (cycleModes.length > 1) {
              setCycleModes(cycleModes.filter(m => m !== mode));
          }
      } else {
          setCycleModes([...cycleModes, mode]);
      }
  };

  const renderModeButton = (mode: VisualMode, label: string) => (
      <button 
        key={mode}
        onClick={() => setVisualMode(mode)}
        className={`flex-1 border border-white/20 rounded py-2 text-[10px] font-bold transition-all relative overflow-hidden ${visualMode === mode ? 'bg-white/20 border-white/50 text-white shadow' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
        {label}
        {isAutoCycle && cycleModes.includes(mode) && (
            <div className="absolute top-1 right-1 w-1 h-1 bg-purple-500 rounded-full animate-pulse" />
        )}
      </button>
  );

  return (
    <>
      {/* Open Button (Visible when closed) */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-40 bg-black/80 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-cyan-900/50 hover:border-cyan-500 transition-all duration-300 shadow-lg ${!isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-20 opacity-0 pointer-events-none'}`}
        aria-label="Open Controls"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </button>

      {/* Main Panel */}
      <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white z-50 transition-all duration-300 shadow-2xl ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-[120%] opacity-0 pointer-events-none'}`}>
        
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
          <h2 className="font-['Space_Mono'] text-sm font-bold text-cyan-400">GT2-PRISM CONTROLS</h2>
          <div className="flex items-center gap-2">
            <button onClick={toggleFullscreen} className="text-[10px] font-mono bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
              [ ] FULLSCREEN
            </button>
            <button 
                onClick={() => setIsOpen(false)} 
                className="text-white/50 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
                aria-label="Close Controls"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Source Selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">AUDIO SOURCE</label>
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg mb-2">
              <button 
                onClick={() => setSourceType(AudioSourceType.MICROPHONE)}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${sourceType === AudioSourceType.MICROPHONE ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                MIC
              </button>
              <button 
                onClick={() => setSourceType(AudioSourceType.SYSTEM_FILE)}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${sourceType === AudioSourceType.SYSTEM_FILE ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                FILE
              </button>
              <button 
                onClick={() => setSourceType(AudioSourceType.BROWSER_TAB)}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${sourceType === AudioSourceType.BROWSER_TAB ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                TAB
              </button>
            </div>
            
            <div className="flex flex-col gap-1 px-1 mt-2">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="monitorAudio"
                  checked={isMonitoring} 
                  onChange={(e) => setIsMonitoring(e.target.checked)}
                  className="accent-cyan-500 w-3.5 h-3.5"
                />
                <label htmlFor="monitorAudio" className="text-xs text-gray-300 cursor-pointer select-none">
                   MONITOR AUDIO
                </label>
              </div>
              {isMonitoring && sourceType === AudioSourceType.MICROPHONE && (
                <p className="text-[10px] text-orange-400 font-mono">
                    ⚠️ FEEDBACK RISK: USE HEADPHONES
                </p>
              )}
            </div>
          </div>

          {/* File Input */}
          {sourceType === AudioSourceType.SYSTEM_FILE && (
            <div className="animate-fade-in">
               <input 
                type="file" 
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onFileUpload(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors"
               />
            </div>
          )}

          {/* Visual Mode */}
          <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-gray-400">VISUAL MODE</label>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsCycleConfigOpen(!isCycleConfigOpen)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${isCycleConfigOpen ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-white'}`}
                    >
                        {isCycleConfigOpen ? 'DONE' : 'CONFIG'}
                    </button>
                    <input 
                        type="checkbox" 
                        id="autoCycle"
                        checked={isAutoCycle} 
                        onChange={(e) => setIsAutoCycle(e.target.checked)}
                        className="accent-purple-500 w-3 h-3"
                    />
                    <label htmlFor="autoCycle" className="text-[10px] text-purple-300 cursor-pointer select-none">
                        AUTO CYCLE
                    </label>
                </div>
            </div>

            {isCycleConfigOpen && (
                <div className="mb-2 p-2 bg-purple-900/20 border border-purple-500/30 rounded text-[10px]">
                    <p className="text-purple-200 mb-1 font-bold">CYCLE POOL:</p>
                    <div className="grid grid-cols-2 gap-1">
                        {Object.values(VisualMode).map((m) => (
                            <div key={m} className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={cycleModes.includes(m)}
                                    onChange={() => toggleCycleMode(m)}
                                    className="accent-purple-400 w-3 h-3"
                                />
                                <span className="text-gray-300">{m}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-1">
               {renderModeButton(VisualMode.FLUID, 'FLUID')}
               {renderModeButton(VisualMode.PIXEL, 'VOXEL')}
               {renderModeButton(VisualMode.AFROCENTRIC, 'AFRO')}
               {renderModeButton(VisualMode.CODE, 'CODE')}
               {renderModeButton(VisualMode.CASINO, 'CASINO')}
               {renderModeButton(VisualMode.FIRE, 'FIRE')}
            </div>
          </div>

          {/* Colors */}
          <div className="flex gap-2">
              <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">NAME COLOR</label>
                  <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <input 
                          type="color" 
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-gray-300">{primaryColor}</span>
                  </div>
              </div>
              <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">VISUAL COLOR</label>
                  <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <input 
                          type="color" 
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-gray-300">{secondaryColor}</span>
                  </div>
              </div>
          </div>

          {/* Performer Name */}
          <div>
             <label className="block text-xs text-gray-400 mb-1">PERFORMER NAME</label>
             <input 
               type="text" 
               value={performerName}
               onChange={(e) => setPerformerName(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all placeholder-white/20"
               placeholder="ENTER NAME..."
             />
          </div>

          {/* Additional Texts List Manager */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">ADDITIONAL MESSAGES</label>
            
            {/* Input Row */}
            <div className="flex gap-2 mb-2">
                <input 
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:bg-white/10 placeholder-white/20"
                    placeholder="Type message..."
                />
                <button 
                    onClick={handleAddText}
                    className="px-3 py-1.5 bg-cyan-900/40 hover:bg-cyan-700 border border-cyan-500/50 rounded text-xs font-bold text-cyan-100 transition-colors"
                >
                    ADD
                </button>
            </div>

            {/* List View */}
            {additionalTexts.length > 0 && (
                <div className="max-h-32 overflow-y-auto custom-scrollbar bg-white/5 rounded border border-white/10 p-1">
                    {additionalTexts.map((text, index) => (
                        <div key={index} className="group flex justify-between items-center bg-black/40 mb-1 last:mb-0 p-2 rounded text-xs hover:bg-white/10 transition-colors">
                            <span className="truncate pr-2">{text}</span>
                            <button 
                                onClick={() => handleRemoveText(index)}
                                className="text-white/30 hover:text-red-400 transition-colors p-1"
                                aria-label="Remove item"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {additionalTexts.length === 0 && (
                <div className="text-xs text-white/20 italic text-center py-2 border border-white/5 rounded border-dashed">
                    No extra messages added
                </div>
            )}
          </div>

          {/* Sensitivity */}
          <div>
             <div className="flex justify-between mb-1">
               <label className="block text-xs text-gray-400">SENSITIVITY</label>
               <span className="text-xs text-cyan-400 font-mono">{Math.round(sensitivity * 100)}%</span>
             </div>
             <input 
               type="range" 
               min="0.1" 
               max="2.0" 
               step="0.1"
               value={sensitivity}
               onChange={(e) => setSensitivity(parseFloat(e.target.value))}
               className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
             />
          </div>

          {/* High Fidelity Toggle */}
          <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                    <label className="block text-xs text-gray-200">HIGH FIDELITY</label>
                    <p className="text-[9px] text-gray-500">GPU INTENSIVE</p>
                </div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input 
                        type="checkbox" 
                        name="toggle" 
                        id="toggle" 
                        checked={isHighQuality}
                        onChange={(e) => setIsHighQuality(e.target.checked)}
                        className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-5 transition-all duration-300"
                    />
                    <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors ${isHighQuality ? 'bg-cyan-600' : 'bg-gray-700'}`}></label>
                </div>
              </div>
          </div>

        </div>
      </div>
    </>
  );
};