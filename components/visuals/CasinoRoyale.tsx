import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CasinoRoyaleProps {
  audioData: React.MutableRefObject<{ bass: number; mid: number; high: number }>;
  color: string;
}

const OBJ_COUNT = 150;

export const CasinoRoyale: React.FC<CasinoRoyaleProps> = ({ audioData, color }) => {
  const diceMesh = useRef<THREE.InstancedMesh>(null);
  const chipMesh = useRef<THREE.InstancedMesh>(null);
  
  // Store physics state for each object
  // x, y, z, vx, vy, vz, rotX, rotY, rotZ, vRotX, vRotY, vRotZ
  const physicsData = useMemo(() => {
    const dice = new Float32Array(OBJ_COUNT * 12);
    const chips = new Float32Array(OBJ_COUNT * 12);
    
    const init = (arr: Float32Array) => {
        for(let i=0; i<OBJ_COUNT; i++) {
            const idx = i * 12;
            arr[idx] = (Math.random() - 0.5) * 10;     // x
            arr[idx+1] = (Math.random() - 0.5) * 10;   // y
            arr[idx+2] = (Math.random() - 0.5) * 5;    // z
            arr[idx+6] = Math.random() * Math.PI;      // rx
            arr[idx+7] = Math.random() * Math.PI;      // ry
        }
    };
    init(dice);
    init(chips);
    return { dice, chips };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    const { bass, mid } = audioData.current;
    
    const time = state.clock.getElapsedTime();
    
    // Physics parameters
    const damping = 0.98;
    const gravity = -0.5 * (1 - bass); // Gravity reduces when bass hits (anti-gravity)
    const turbulence = mid * 5.0;

    const updatePhysics = (mesh: THREE.InstancedMesh, data: Float32Array, isChip: boolean) => {
        for(let i=0; i<OBJ_COUNT; i++) {
            const idx = i * 12;

            // Apply Forces
            // 1. Gravity
            data[idx+4] += gravity * delta; 
            
            // 2. Center attraction (keep them in view)
            data[idx+3] -= data[idx] * 0.5 * delta;
            data[idx+4] -= data[idx+1] * 0.5 * delta;
            data[idx+5] -= data[idx+2] * 0.5 * delta;
            
            // 3. Audio Explosion (Bass)
            if (bass > 0.4) {
                 const dirX = data[idx]; 
                 const dirY = data[idx+1]; 
                 const dirZ = data[idx+2];
                 // Normalize approx
                 const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ) + 0.001;
                 const force = bass * 15.0 * delta; // Explosion strength
                 data[idx+3] += (dirX/len) * force;
                 data[idx+4] += (dirY/len) * force;
                 data[idx+5] += (dirZ/len) * force;
                 
                 // Add spin
                 data[idx+9] += (Math.random() - 0.5) * 10 * delta;
                 data[idx+10] += (Math.random() - 0.5) * 10 * delta;
            }
            
            // 4. Turbulence (Mids)
            data[idx+3] += (Math.sin(time + i) * turbulence) * delta;
            data[idx+4] += (Math.cos(time + i * 2) * turbulence) * delta;

            // Update Velocity & Position
            data[idx+3] *= damping;
            data[idx+4] *= damping;
            data[idx+5] *= damping;
            
            data[idx] += data[idx+3] * delta;
            data[idx+1] += data[idx+4] * delta;
            data[idx+2] += data[idx+5] * delta;

            // Rotation
            data[idx+9] *= 0.95; // Rot damping
            data[idx+10] *= 0.95;
            data[idx+11] *= 0.95;
            
            // Base rotation
            data[idx+6] += (0.5 + data[idx+9]) * delta;
            data[idx+7] += (0.5 + data[idx+10]) * delta;

            // Apply to Matrix
            dummy.position.set(data[idx], data[idx+1], data[idx+2]);
            dummy.rotation.set(data[idx+6], data[idx+7], data[idx+8]);
            
            // Scale pulse
            const scale = isChip ? 1.0 : 1.0 + (bass * 0.5);
            dummy.scale.set(scale, scale, scale);
            
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
      {/* DICE: White with user color tint */}
      <instancedMesh ref={diceMesh} args={[undefined, undefined, OBJ_COUNT]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} emissive={color} emissiveIntensity={0.2} />
      </instancedMesh>
      
      {/* CHIPS: Gold/Metallic */}
      <instancedMesh ref={chipMesh} args={[undefined, undefined, OBJ_COUNT]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </instancedMesh>
      
      {/* Environment lighting for reflections */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="white" />
      <pointLight position={[-10, -5, -10]} intensity={1} color={color} />
    </group>
  );
};