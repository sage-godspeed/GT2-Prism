import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioAnalysisData } from '../../types';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform vec3 uColor;
  
  varying vec2 vUv;

  // GLSL Noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // Fractional Brownian Motion
  float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
          value += amplitude * snoise(st);
          st *= 2.0;
          amplitude *= 0.5;
      }
      return value;
  }

  // Lightning Generation
  float lightning(vec2 uv, float time, float seed) {
      // Scale UV for thin lines
      vec2 p = uv * 4.0;
      // Animate y to simulate falling/striking
      p.y += time * 10.0; 
      
      // Domain warping to create jagged path
      float n = fbm(p + fbm(p + time));
      
      // Create thin line from noise zero-crossing or ridges
      float bolt = 1.0 - abs(n * 2.0 - 1.0);
      bolt = pow(bolt, 10.0); // Sharpen
      
      // Mask horizontally to keep it somewhat centered or localized
      float mask = smoothstep(0.5, 0.0, abs(uv.x - seed));
      
      return bolt * mask;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    
    // --- FIRE SIMULATION ---
    
    // Make fire faster and more turbulent with bass
    float speed = uTime * (2.0 + uBass * 3.0);
    
    // Domain distortion for fluid fire
    vec2 q = vec2(0.);
    q.x = fbm(uv + 0.1 * uTime);
    q.y = fbm(uv + vec2(1.0));
    
    vec2 r = vec2(0.);
    r.x = fbm(uv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * speed);
    r.y = fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * speed);
    
    float f = fbm(uv + r);
    
    // Shape: Concentrated center, rising
    float gradient = 1.2 - length(vec2(uv.x * 0.8, uv.y + 0.8)); // Taller fire
    
    // Combine
    float fireIntensity = (f * f * 3.0 + gradient);
    
    // Cutoff/Contrast
    fireIntensity = smoothstep(0.2, 1.2 + uBass * 0.5, fireIntensity);
    
    // Colors
    vec3 colCore = vec3(1.0, 1.0, 0.8); // White-hot
    vec3 colOuter = uColor; // User color
    vec3 colDark = vec3(0.1, 0.0, 0.0);
    
    vec3 fireColor = mix(vec3(0.0), colDark, smoothstep(0.0, 0.4, fireIntensity));
    fireColor = mix(fireColor, colOuter, smoothstep(0.4, 0.8, fireIntensity));
    fireColor = mix(fireColor, colCore, smoothstep(0.8, 1.0, fireIntensity));
    
    // --- LIGHTNING SIMULATION ---
    
    vec3 lightningColor = vec3(0.0);
    
    // Trigger lightning on High frequency hits or randomly
    // Use uTime to seed randomness
    float trigger = snoise(vec2(uTime * 0.5, 0.0));
    
    // If Highs are strong, or random trigger is high
    if (uHigh > 0.4 || trigger > 0.8) {
        // Random position for bolt
        float seed = snoise(vec2(floor(uTime * 10.0), 10.0)); 
        
        float bolt = lightning(uv, uTime, seed);
        
        // Flicker intensity
        float flash = fract(sin(uTime * 50.0));
        
        // Electric Blue/White color usually, but let's mix with user color
        vec3 boltCol = mix(vec3(0.8, 0.9, 1.0), uColor, 0.3);
        
        lightningColor += boltCol * bolt * flash * 5.0; // Very bright
    }
    
    // Global flash on heavy bass hits
    if (uBass > 0.8) {
        fireColor += vec3(0.2) * (uBass - 0.8);
    }

    vec3 finalColor = fireColor + lightningColor;
    
    // Post-process vignette
    finalColor *= 1.0 - smoothstep(0.5, 1.5, length(uv));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface FireRealmProps {
  audioData: React.MutableRefObject<AudioAnalysisData>;
  color: string;
}

export const FireRealm: React.FC<FireRealmProps> = ({ audioData, color }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uColor: { value: new THREE.Color(color) }
    }),
    []
  );

  useEffect(() => {
    if (materialRef.current) {
        materialRef.current.uniforms.uColor.value.set(color);
    }
  }, [color]);

  useFrame((state) => {
    const { bass, mid, high } = audioData.current;
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Snappy response
      materialRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uBass.value, bass, 0.3);
      materialRef.current.uniforms.uMid.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uMid.value, mid, 0.3);
      materialRef.current.uniforms.uHigh.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uHigh.value, high, 0.3);
    }
  });

  return (
    <mesh position={[0, 0, -1]}>
      <planeGeometry args={[14, 14]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};