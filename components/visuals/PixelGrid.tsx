import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PixelGridProps {
  audioData: React.MutableRefObject<{ frequencyData: Uint8Array; bass: number; mid: number; high: number }>;
  color: string;
}

const GRID_SIZE = 32;
const COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 0.4;
const PARTICLE_COUNT = 200;

// Simple pseudo-noise function for waves
const noise = (x: number, z: number, t: number) => {
  return Math.sin(x * 0.5 + t) * Math.cos(z * 0.5 + t * 0.8) 
       + Math.sin(x * 1.5 + t * 0.3) * 0.5;
};

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();
const baseColor = new THREE.Color();
const targetHSL = { h: 0, s: 0, l: 0 };

export const PixelGrid: React.FC<PixelGridProps> = ({ audioData, color }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ 
    roughness: 0.1,
    metalness: 0.1,
    envMapIntensity: 1
  }), []);

  const particlesMaterial = useMemo(() => new THREE.PointsMaterial({
      color: color,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
  }), []);

  // Update particle color when prop changes
  useEffect(() => {
    particlesMaterial.color.set(color);
  }, [color, particlesMaterial]);

  const particlesGeometry = useMemo(() => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(PARTICLE_COUNT * 3);
      for(let i=0; i<PARTICLE_COUNT*3; i++) {
          pos[i] = (Math.random() - 0.5) * GRID_SIZE * SPACING * 1.5;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      const { bass, mid, high } = audioData.current;
      const time = state.clock.getElapsedTime();
      const offset = (GRID_SIZE * SPACING) / 2;

      // Extract HSL from user selected color
      baseColor.set(color);
      baseColor.getHSL(targetHSL);

      let i = 0;
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          const nx = (x / GRID_SIZE) * 2 - 1;
          const nz = (z / GRID_SIZE) * 2 - 1;

          const waveHeight = noise(x * 0.2, z * 0.2, time * 1.5);
          const dist = Math.sqrt(nx*nx + nz*nz);
          const bassLift = Math.max(0, 1 - dist) * bass * 3; 
          
          const y = waveHeight * (0.5 + bass * 1.5) + bassLift;

          tempObject.position.set(
            (x * SPACING) - offset,
            y, 
            (z * SPACING) - offset
          );

          tempObject.rotation.x = Math.sin(time + x) * 0.1 + (bass * 0.2);
          tempObject.rotation.z = Math.cos(time + z) * 0.1 + (bass * 0.2);

          const scaleY = 1 + (bass * 2) + (mid * 1);
          tempObject.scale.set(0.9, 0.9, 0.9);
          
          tempObject.updateMatrix();
          meshRef.current.setMatrixAt(i, tempObject.matrix);

          // Algorithmically derive shades
          // Hue: Shift slightly based on wave height
          const h = (targetHSL.h + (waveHeight * 0.05) - (bass * 0.05)) % 1; 
          // Saturation: Boost with bass
          const s = Math.min(1, targetHSL.s + (bass * 0.3));
          // Lightness: Darker base, lighter tips (highs)
          const l = Math.max(0.1, Math.min(0.9, targetHSL.l * 0.5 + (mid * 0.4) + (high * 0.5 * (y > 1 ? 1 : 0))));

          tempColor.setHSL(h, s, l);
          meshRef.current.setColorAt(i, tempColor);

          i++;
        }
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }

    if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const time = state.clock.getElapsedTime();
        const { bass } = audioData.current;

        for(let i=0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            positions[i3 + 1] += 0.02 + (bass * 0.1); 
            positions[i3] += Math.sin(time + i) * 0.01;
            positions[i3 + 2] += Math.cos(time + i) * 0.01;

            if (positions[i3 + 1] > 8) {
                positions[i3 + 1] = -5;
                positions[i3] = (Math.random() - 0.5) * GRID_SIZE * SPACING * 1.5;
                positions[i3 + 2] = (Math.random() - 0.5) * GRID_SIZE * SPACING * 1.5;
            }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        (particlesRef.current.material as THREE.PointsMaterial).size = 0.15 + (bass * 0.2);
    }
  });

  return (
    <group>
        <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, COUNT]}
        castShadow
        receiveShadow
        >
        <boxGeometry args={[SPACING, SPACING, SPACING]} />
        <primitive object={material} attach="material" />
        </instancedMesh>

        <points ref={particlesRef} geometry={particlesGeometry} material={particlesMaterial} />
    </group>
  );
};
