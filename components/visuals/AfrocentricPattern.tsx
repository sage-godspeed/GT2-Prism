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

  #define PI 3.14159265359

  // --- UTILS ---
  mat2 rot(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, -s, s, c);
  }

  // Organic Noise for texture
  float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // --- SDF SHAPES ---

  float sdCircle(vec2 p, float r) {
      return length(p) - r;
  }

  // Box (for Kente/Ndebele patterns)
  float sdBox(vec2 p, vec2 b) {
      vec2 d = abs(p)-b;
      return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
  }

  // Equilateral Triangle
  float sdTri(vec2 p, float r) {
      const float k = sqrt(3.0);
      p.x = abs(p.x) - r;
      p.y = p.y + r/k;
      if( p.x+k*p.y > 0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
      p.x -= clamp( p.x, -2.0*r, 0.0 );
      return -length(p)*sign(p.y);
  }

  // Vesica (Leaf/Cowrie shape)
  // r is radius of circles, d is distance from center
  float sdVesica(vec2 p, float r, float d) {
      p = abs(p);
      float b = sqrt(r*r - d*d);
      return ((p.y-b)*d > p.x*b) ? length(p-vec2(0.0,b))
                                 : length(p-vec2(-d,0.0))-r;
  }

  // --- DRAWING UTILS ---
  
  // Anti-aliased fill
  float fill(float sdf) {
      return 1.0 - smoothstep(-0.005, 0.005, sdf);
  }
  
  // Anti-aliased stroke
  float stroke(float sdf, float w) {
      return 1.0 - smoothstep(w - 0.005, w + 0.005, abs(sdf));
  }

  void main() {
    // Normalize UVs to -1...1
    vec2 uv = vUv * 2.0 - 1.0;
    
    // Add subtle organic distortion to the whole coordinate system based on bass
    // This gives it a "living fabric" feel
    float distort = noise(uv * 3.0 + uTime * 0.2);
    uv += distort * 0.03 * (1.0 + uBass);

    float d = length(uv);
    float a = atan(uv.y, uv.x);
    
    // --- PALETTE DEFINITION ---
    // Mixing culturally inspired earth tones with the user's selected color
    vec3 colMud = vec3(0.15, 0.1, 0.08);    // Deep Earth/Mud
    vec3 colClay = vec3(0.9, 0.85, 0.75);   // Bone/Clay White
    vec3 colGold = vec3(1.0, 0.7, 0.1);     // Akan Gold
    vec3 colIndigo = vec3(0.1, 0.1, 0.4);   // Indigo Dye
    vec3 colRed = vec3(0.65, 0.15, 0.1);    // Ndebele/Ochre Red
    
    // Base Canvas Color
    vec3 col = colMud;
    
    // --- LAYER 1: MUDCLOTH BACKGROUND ---
    // Procedural dashed grid pattern
    vec2 gridUV = uv * 8.0; // Grid density
    vec2 gridId = floor(gridUV);
    vec2 gridLocal = fract(gridUV) - 0.5;
    
    // Checkerboard logic for dash direction
    float check = mod(gridId.x + gridId.y, 2.0);
    float dash = (check > 0.5) ? length(gridLocal.y) : length(gridLocal.x);
    
    // Fade background near center to create a stage for the glyphs
    float bgMask = smoothstep(0.4, 1.1, d);
    float bgPattern = stroke(dash - 0.2, 0.05) * bgMask;
    
    // Apply background pattern with indigo tint
    col = mix(col, mix(colMud, colIndigo, 0.5), bgPattern * 0.5);


    // --- LAYER 2: NDEBELE BORDERS (NEW) ---
    // Vertical stepped geometric bands on the left and right edges
    // These react to Bass by shifting slightly
    float sideMirror = abs(uv.x);
    float borderPulse = uBass * 0.05;
    
    // Divide vertical space into cells
    float ndebeleY = floor((uv.y + uTime * 0.1) * 4.0);
    float ndebeleOffset = mod(ndebeleY, 2.0) == 0.0 ? 0.08 : -0.08;
    
    // Define the stepped border shape
    // Distance from edge (0.85) modified by the offset pattern
    float borderSDF = -(sideMirror - (0.85 + ndebeleOffset + borderPulse));
    
    // Choose color based on row parity (Alternating Red and Indigo)
    vec3 ndebeleColor = mod(ndebeleY, 2.0) == 0.0 ? colRed : colIndigo;
    
    // Draw the solid border
    col = mix(col, ndebeleColor, fill(borderSDF));
    // Add a clay outline
    col = mix(col, colClay, stroke(borderSDF, 0.008));


    // --- LAYER 3: OUTER ZIGZAG RING ---
    // Represents mountains or protection. Reacts to Bass.
    float zigFreq = 24.0;
    float zigAmp = 0.03 + (uBass * 0.04);
    float zigRadius = 0.9;
    
    // Deform radius with sine wave
    float zigD = abs(d - (zigRadius + sin(a * zigFreq + uTime * 0.5) * zigAmp));
    col += stroke(zigD, 0.01) * uColor;


    // --- LAYER 4: COWRIE SHELL RING ---
    // Represents wealth and destiny. Reacts to High frequencies.
    float numShells = 12.0;
    float shellAngleStep = (2.0 * PI) / numShells;
    float shellRotSpeed = uTime * 0.2;
    
    float currentA = a + shellRotSpeed;
    float shellSector = floor(currentA / shellAngleStep);
    float shellLocalA = mod(currentA, shellAngleStep) - shellAngleStep * 0.5;
    
    vec2 shellPos = vec2(cos(shellLocalA), sin(shellLocalA)) * d;
    shellPos.x -= 0.68; // Ring Radius
    
    float shellSize = 0.07 + (uHigh * 0.05);
    float shellBody = sdVesica(shellPos, shellSize * 1.5, shellSize * 0.85);
    float shellSlit = sdVesica(shellPos, shellSize * 1.1, shellSize * 0.2);
    
    float cowrie = max(fill(shellBody) - fill(shellSlit), 0.0);
    vec3 shellColor = mix(colClay, uColor, uHigh * 0.8);
    col = mix(col, shellColor, cowrie);


    // --- LAYER 5: KENTE DIAMOND RING (NEW) ---
    // Interlocking squares/diamonds between Cowries and Triangles
    // Reacts to Mids
    float kCount = 16.0;
    float kAngleStep = (2.0 * PI) / kCount;
    float kRotSpeed = -uTime * 0.15; // Counter-rotate slowly
    
    float kA = a + kRotSpeed;
    float kSector = floor(kA / kAngleStep);
    float kLocalA = mod(kA, kAngleStep) - kAngleStep * 0.5;
    
    vec2 kPos = vec2(cos(kLocalA), sin(kLocalA)) * d;
    kPos.x -= 0.50; // Radius (Between 0.35 and 0.68)
    kPos = rot(PI/4.0) * kPos; // Rotate 45deg to make diamonds
    
    float kSize = 0.025 + (uMid * 0.03);
    float kSDF = sdBox(kPos, vec2(kSize));
    
    // Alternate colors: Gold and User Color
    vec3 kColor = mod(kSector, 2.0) == 0.0 ? colGold : mix(colIndigo, uColor, 0.5);
    
    col = mix(col, kColor, fill(kSDF));
    col = mix(col, colClay, stroke(kSDF, 0.002));


    // --- LAYER 6: INNER TRIANGLES (PYRAMIDS) ---
    // Represents stability/family. Reacts to Mid frequencies.
    float numTris = 6.0;
    float triAngleStep = (2.0 * PI) / numTris;
    float triRotSpeed = -uTime * 0.4; 
    
    float triCurrentA = a + triRotSpeed;
    float triLocalA = mod(triCurrentA, triAngleStep) - triAngleStep * 0.5;
    
    vec2 triPos = vec2(cos(triLocalA), sin(triLocalA)) * d;
    triPos.x -= 0.32; // Radius
    triPos = rot(-PI/2.0) * triPos; // Point outward
    
    float triSize = 0.06 + (uMid * 0.04);
    float triSDF = sdTri(triPos, triSize);
    
    col = mix(col, colGold, fill(triSDF));
    col = mix(col, uColor, stroke(triSDF, 0.005));


    // --- LAYER 7: CENTER GLYPH (ADINKRAHENE) ---
    // Represents Charisma/Leadership. Reacts to Bass.
    float pulse = uBass * 0.15;
    
    float c1 = sdCircle(uv, 0.05 + pulse);             
    float c2 = abs(sdCircle(uv, 0.13 + pulse)) - 0.02; 
    float c3 = abs(sdCircle(uv, 0.22 + pulse)) - 0.01; 
    
    col = mix(col, uColor, fill(c1));
    col = mix(col, colGold, fill(c2));
    col = mix(col, colClay, fill(c3));


    // --- POST PROCESSING ---
    
    // Vignette
    col *= 1.0 - smoothstep(0.85, 1.4, d);
    
    // Apply organic grain texture
    float grain = noise(uv * 150.0);
    col = mix(col, col * (0.8 + 0.4 * grain), 0.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface AfrocentricPatternProps {
  audioData: React.MutableRefObject<AudioAnalysisData>;
  color: string;
}

export const AfrocentricPattern: React.FC<AfrocentricPatternProps> = ({ audioData, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
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
      
      // Smooth out audio values for shader
      materialRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uBass.value,
        bass,
        0.2
      );
      materialRef.current.uniforms.uMid.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMid.value,
        mid,
        0.2
      );
      materialRef.current.uniforms.uHigh.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uHigh.value,
        high,
        0.2
      );
    }
    
    // Gentle floating motion for the plane itself
    if (meshRef.current) {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.z = Math.sin(t * 0.15) * 0.05;
        meshRef.current.position.y = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[12, 12]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};