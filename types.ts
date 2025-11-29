import React from 'react';

export enum AudioSourceType {
  MICROPHONE = 'MICROPHONE',
  SYSTEM_FILE = 'SYSTEM_FILE',
  BROWSER_TAB = 'BROWSER_TAB'
}

export enum VisualMode {
  FLUID = 'FLUID',
  PIXEL = 'PIXEL',
  AFROCENTRIC = 'AFROCENTRIC',
  CODE = 'CODE',
  CASINO = 'CASINO',
  FIRE = 'FIRE'
}

export interface AudioAnalysisData {
  bass: number; // 0-1
  mid: number;  // 0-1
  high: number; // 0-1
  volume: number; // 0-1 (Smoothed RMS)
  frequencyData: Uint8Array;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      instancedMesh: any;
      primitive: any;
      points: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
      directionalLight: any;
      boxGeometry: any;
      planeGeometry: any;
      icosahedronGeometry: any;
      cylinderGeometry: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      shaderMaterial: any;
      pointsMaterial: any;
      meshBasicMaterial: any;
      [elemName: string]: any;
    }
  }
}