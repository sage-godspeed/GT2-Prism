import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;

  // Simplex 3D Noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    
    // 1. Base undulating motion (always present)
    float noiseBase = snoise(position * 0.8 + uTime * 0.2);
    
    // 2. Energetic Bass Noise:
    // Scale position by bass so the "texture" of the noise changes on hits
    float noiseBass = snoise(position * (1.0 + uBass * 1.5) + uTime * 1.2);
    
    // 3. High Frequency Jitter
    float noiseHigh = snoise(position * 6.0 + uTime * 4.0);

    // Composite Displacement
    float displacement = 0.0;
    
    // Base breathing (slow)
    displacement += noiseBase * 0.3;
    
    // Bass Punch: Expands significantly and ripples strongly
    // We use pow(uBass, 2.0) to make strong beats exponentially stronger than weak ones
    displacement += noiseBass * (0.2 + pow(uBass, 1.5) * 2.0); 
    
    // Highs add sharp surface texture
    displacement += noiseHigh * (uHigh * 0.3);

    vDisplacement = displacement;
    
    // Apply displacement along normal
    vec3 newPosition = position + normal * displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform vec3 uColor;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;

  void main() {
    // Dynamic base color brightness based on energy
    vec3 targetColor = uColor;
    
    // Darken low-energy areas for contrast
    vec3 color = targetColor * (0.1 + uBass * 0.2);
    
    // Highlights based on displacement (peaks are brighter)
    float peak = smoothstep(0.0, 1.5, vDisplacement);
    color = mix(color, targetColor * 2.5, peak);
    
    // Mid-range adds a complementary color shift
    // This creates that "oil slick" look when music is complex
    vec3 secondaryColor = vec3(uColor.g, uColor.b, uColor.r); 
    color += secondaryColor * uMid * smoothstep(0.3, 1.2, vDisplacement);

    // --- TOPOGRAPHY LINES ---
    // Create rhythmic contour lines based on displacement height
    float lineFreq = 20.0;
    // Animate lines sliding slowly
    float lineAnim = uTime * 0.2;
    float stripe = sin((vDisplacement * lineFreq) - lineAnim);
    
    // Sharpen sine wave into thin lines
    // Make them slightly wider on bass hits for impact
    // Kept the thin weight (0.98 base) requested previously
    float lineThickness = 0.98 - (uBass * 0.05);
    float lines = smoothstep(lineThickness, 1.0, stripe);

    // --- INTERMITTENT VISIBILITY ---
    // Combine two slow sine waves for an organic, non-repetitive on/off cycle
    // Cycles roughly every 10-15 seconds
    float visibilityCycle = sin(uTime * 0.4) + sin(uTime * 0.25) * 0.5;
    
    // Smooth transition between visible and invisible
    float lineOpacity = smoothstep(-0.2, 0.2, visibilityCycle);
    
    // Add lines to composition (White/Bright), multiplied by opacity
    color += vec3(1.0) * lines * (0.5 + uMid) * lineOpacity;

    // Highs add white electric sparkles/noise
    float sparkleNoise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    float sparkle = step(0.98 - (uHigh * 0.1), sparkleNoise) * uHigh;
    color += vec3(1.0) * sparkle * 2.0;

    // Intense Rim Lighting that pumps with bass
    float fresnel = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    color += uColor * fresnel * (0.5 + pow(uBass, 2.0) * 3.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

interface FluidSphereProps {
  audioData: React.MutableRefObject<{ bass: number; mid: number; high: number }>;
  color: string;
  isHighQuality: boolean;
}

export const FluidSphere: React.FC<FluidSphereProps> = ({ audioData, color, isHighQuality }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Track accumulated time separately to vary speed
  const timeRef = useRef(0);

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

  // Update uniform when color prop changes
  useEffect(() => {
    if (materialRef.current) {
        materialRef.current.uniforms.uColor.value.set(color);
    }
  }, [color]);

  useFrame((_state, delta) => {
    const { bass, mid, high } = audioData.current;

    if (materialRef.current) {
      // DYNAMIC TIME: Speed up the fluid simulation when bass hits.
      const timeSpeed = 0.5 + (bass * 3.5);
      timeRef.current += delta * timeSpeed;
      materialRef.current.uniforms.uTime.value = timeRef.current;
      
      // Use a faster lerp (0.3 instead of 0.1) for snappier response
      // We also map the bass non-linearly (pow) to emphasize heavy hits over background noise
      const targetBass = Math.pow(bass, 1.2); 
      
      materialRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uBass.value,
        targetBass,
        0.3 
      );
      materialRef.current.uniforms.uMid.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMid.value,
        mid,
        0.3
      );
      materialRef.current.uniforms.uHigh.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uHigh.value,
        high,
        0.3
      );
    }

    if (meshRef.current) {
      // Rotation kick: Spin faster on beats
      meshRef.current.rotation.y += 0.002 + (bass * 0.04);
      meshRef.current.rotation.z += 0.001 + (mid * 0.02);
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Dynamic Resolution: 40 for perf, 90 for high fidelity */}
      <icosahedronGeometry args={[2.5, isHighQuality ? 90 : 40]} /> 
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        wireframe={false}
        uniforms={uniforms}
      />
    </mesh>
  );
};