import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { AudioManager } from '../services/audioManager';
import { VisualMode, AudioAnalysisData } from '../types';
import { FluidSphere } from './visuals/FluidSphere';
import { PixelGrid } from './visuals/PixelGrid';
import { AfrocentricPattern } from './visuals/AfrocentricPattern';
import { CodeMatrix } from './visuals/CodeMatrix';
import { CasinoRoyale } from './visuals/CasinoRoyale';
import { FireRealm } from './visuals/FireRealm';

interface VisualizerSceneProps {
  audioManager: AudioManager;
  mode: VisualMode;
  sensitivity: number;
  color: string;
  isHighQuality: boolean;
}

// Internal component to handle the frame loop and pass data to visuals via refs
const SceneContent: React.FC<{ audioManager: AudioManager; mode: VisualMode; sensitivity: number; color: string; isHighQuality: boolean }> = ({ audioManager, mode, sensitivity, color, isHighQuality }) => {
  const audioDataRef = useRef<AudioAnalysisData>({ 
    bass: 0, 
    mid: 0, 
    high: 0, 
    volume: 0,
    frequencyData: new Uint8Array(0) 
  });

  useFrame(() => {
    // 1. Get raw data from audio service
    const rawData = audioManager.getAnalysis();

    // 2. Apply sensitivity multiplier
    audioDataRef.current = {
      bass: Math.min(rawData.bass * sensitivity, 1),
      mid: Math.min(rawData.mid * sensitivity, 1),
      high: Math.min(rawData.high * sensitivity, 1),
      volume: Math.min(rawData.volume * sensitivity, 1),
      frequencyData: rawData.frequencyData
    };
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color={color} />
      <pointLight position={[-10, -10, -10]} intensity={1.0} color="#ffffff" />
      
      {mode === VisualMode.FLUID && <FluidSphere audioData={audioDataRef} color={color} isHighQuality={isHighQuality} />}
      {mode === VisualMode.PIXEL && (
        <>
            <PixelGrid audioData={audioDataRef} color={color} />
            <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={2} color={color} castShadow />
        </>
      )}
      {mode === VisualMode.AFROCENTRIC && (
          <AfrocentricPattern audioData={audioDataRef} color={color} />
      )}
      {mode === VisualMode.CODE && (
          <CodeMatrix audioData={audioDataRef} color={color} />
      )}
      {mode === VisualMode.CASINO && (
          <CasinoRoyale audioData={audioDataRef} color={color} />
      )}
      {mode === VisualMode.FIRE && (
          <FireRealm audioData={audioDataRef} color={color} />
      )}

      <EffectComposer>
        <Bloom 
            luminanceThreshold={0.2} 
            mipmapBlur 
            intensity={mode === VisualMode.FLUID || mode === VisualMode.FIRE || mode === VisualMode.CODE ? 0.8 : 1.2} 
            radius={0.4}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </>
  );
};

export const VisualizerScene: React.FC<VisualizerSceneProps> = (props) => {
  return (
    <div className="w-full h-full bg-black">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]} 
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
};