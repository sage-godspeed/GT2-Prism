import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioAnalysisData } from '../../types';

interface CasinoRoyaleProps {
  audioData: React.MutableRefObject<AudioAnalysisData>;
  color: string;
}

const OBJ_COUNT = 150;

export const CasinoRoyale: React.FC<CasinoRoyaleProps> = ({ audioData, color }) => {
  const diceMesh = useRef<THREE.InstancedMesh>(null);
  const chipMesh = useRef<THREE.InstancedMesh>(null);
  const mainLightRef = useRef<THREE.PointLight>(null);
  const fillLightRef = useRef<THREE.PointLight>(null);

  // Material Refs to update color dynamically
  const diceMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const chipMatRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // Store physics state for each object
  // x, y, z, vx, vy, vz, rotX, rotY, rotZ, vRotX, vRotY, vRotZ
  const physicsData = useMemo(() => {
    const dice = new Float32Array(OBJ_COUNT * 12);
    const chips = new Float32Array(OBJ_COUNT * 12);
    
    const init = (arr: Float32Array) => {
        for(let i=0; i<OBJ_COUNT; i++) {
            const idx = i * 12;
            arr[idx] = (Math.random() - 0.5) * 12;     // Wider spread
            arr[idx+1] = (Math.random() - 0.5) * 12;
            arr[idx+2] = (Math.random() - 0.5) * 6;
            arr[idx+6] = Math.random() * Math.PI;      
            arr[idx+7] = Math.random() * Math.PI;      
        }
    };
    init(dice);
    init(chips);
    return { dice, chips };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Update material color when prop changes
  useEffect(() => {
    if (diceMatRef.current) {
        diceMatRef.current.emissive.set(color);
    }
    if (chipMatRef.current) {
        chipMatRef.current.color.set(color);
    }
    if (fillLightRef.current) {
        fillLightRef.current.color.set(color);
    }
  }, [color]);

  useFrame((state, delta) => {
    const { bass, mid, high } = audioData.current;
    
    const time = state.clock.getElapsedTime();
    
    // ELECTRO TUNING:
    // 1. High damping for snappy stop-and-go (Sidechain feel)
    const damping = 0.92; 
    // 2. Strong gravity that reacts to kick by reversing
    const baseGravity = -5.0; 
    const gravity = (baseGravity + (bass * 15.0)) * delta; 
    
    // 3. Digital turbulence (Jittery)
    const turbulence = mid * 8.0;

    // 4. Strobe Light
    if (mainLightRef.current) {
        // Flickering white light on highs + heavy pump on bass
        const strobe = (Math.sin(time * 30) > 0 ? 1 : 0) * high;
        mainLightRef.current.intensity = 1.0 + (bass * 5.0) + (strobe * 2.0);
    }

    if (diceMatRef.current) {
        // Dice glow with the beat
        diceMatRef.current.emissiveIntensity = 0.2 + (bass * 2.0);
    }

    const updatePhysics = (mesh: THREE.InstancedMesh, data: Float32Array, isChip: boolean) => {
        for(let i=0; i<OBJ_COUNT; i++) {
            const idx = i * 12;

            // Apply Forces
            
            // Gravity (Reverse on kick)
            data[idx+4] += gravity * delta; 
            
            // Center Attraction (Keep objects in view)
            // Stronger pull when no bass to reset scene
            const pullStrength = 1.5 * (1.0 - bass * 0.5); 
            data[idx+3] -= data[idx] * pullStrength * delta;
            data[idx+4] -= data[idx+1] * pullStrength * delta;
            data[idx+5] -= data[idx+2] * pullStrength * delta;
            
            // ELECTRO KICK: Explosive Radial Force
            if (bass > 0.5) {
                 const dirX = data[idx]; 
                 const dirY = data[idx+1]; 
                 const dirZ = data[idx+2];
                 const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ) + 0.001;
                 
                 // Violent, short impulse
                 const force = bass * 40.0 * delta; 
                 data[idx+3] += (dirX/len) * force;
                 data[idx+4] += (dirY/len) * force;
                 data[idx+5] += (dirZ/len) * force;
                 
                 // Random Spin Kick
                 data[idx+9] += (Math.random() - 0.5) * 20 * delta;
                 data[idx+10] += (Math.random() - 0.5) * 20 * delta;
            }
            
            // GLITCH: Random teleport on high frequencies (Snares/Hi-hats)
            if (high > 0.4 && Math.random() > 0.98) {
                data[idx] += (Math.random() - 0.5) * 2.0;
                data[idx+1] += (Math.random() - 0.5) * 2.0;
            }
            
            // Turbulence
            data[idx+3] += (Math.sin(time * 2.0 + i) * turbulence) * delta;
            data[idx+4] += (Math.cos(time * 2.0 + i * 2) * turbulence) * delta;

            // Update Velocity & Position
            data[idx+3] *= damping;
            data[idx+4] *= damping;
            data[idx+5] *= damping;
            
            data[idx] += data[idx+3] * delta;
            data[idx+1] += data[idx+4] * delta;
            data[idx+2] += data[idx+5] * delta;

            // Rotation
            data[idx+9] *= 0.90; // Higher rotational drag
            data[idx+10] *= 0.90;
            data[idx+11] *= 0.90;
            
            // Base rotation + Spin
            data[idx+6] += (0.5 + data[idx+9]) * delta;
            data[idx+7] += (0.5 + data[idx+10]) * delta;

            // Apply to Matrix
            dummy.position.set(data[idx], data[idx+1], data[idx+2]);
            
            // Snap rotation to 90 degrees occasionally for "Digital" feel? 
            // Maybe just normal smooth rotation is better for fluid electro, 
            // but let's make it sharp.
            dummy.rotation.set(data[idx+6], data[idx+7], data[idx+8]);
            
            // Scale pulse
            const beatScale = 1.0 + (bass * 0.8);
            dummy.scale.set(beatScale, beatScale, beatScale);
            
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
    };

    if (diceMesh.current) updatePhysics(diceMesh.current, physicsData.dice, false);
    if (chipMesh.current) updatePhysics(chipMesh.current, physicsData.chips, true);
  });

  return (
    <group>
      {/* DICE: White with user color tint emission */}
      <instancedMesh ref={diceMesh} args={[undefined, undefined, OBJ_COUNT]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial 
            ref={diceMatRef}
            color="#111111" // Darker base for better contrast
            roughness={0.1} 
            metalness={0.9} 
            emissive={color} 
            emissiveIntensity={0.2} 
        />
      </instancedMesh>
      
      {/* CHIPS: Metallic with user color */}
      <instancedMesh ref={chipMesh} args={[undefined, undefined, OBJ_COUNT]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
        <meshStandardMaterial 
            ref={chipMatRef}
            color={color} 
            roughness={0.2} 
            metalness={1.0} 
        />
      </instancedMesh>
      
      {/* Lighting Setup for Electro */}
      <ambientLight intensity={0.2} />
      {/* Strobe Light */}
      <pointLight ref={mainLightRef} position={[0, 5, 0]} intensity={1} color="white" distance={20} decay={2} />
      {/* Fill Light (User Color) */}
      <pointLight ref={fillLightRef} position={[0, -5, 0]} intensity={2} color={color} distance={20} decay={2} />
    </group>
  );
};