import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Generate a high-res texture with actual code text
const generateCodeTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Font Settings - Larger and bolder for visibility
  const fontSize = 24;
  const lineHeight = fontSize * 1.5;
  ctx.font = `bold ${fontSize}px "Space Mono", "Courier New", monospace`;
  
  // Syntax Brightness Map (Grayscale values used by shader to map to colors)
  const styles = {
      keyword: '#ffffff', // -> 1.0 (Pink)
      string: '#cccccc',  // -> 0.8 (Yellow)
      type: '#999999',    // -> 0.6 (Cyan)
      normal: '#666666',  // -> 0.4 (User Color)
      comment: '#333333'  // -> 0.2 (Green)
  };

  const codeSnippets = [
    "import { Matrix, Vector3 } from '@neural/core';",
    "const MAX_ENTROPY = 0xFF45;",
    "// Initialize buffer sequence",
    "function decrypt(payload: Bytes): string {",
    "  let hash = 0x811c9dc5;",
    "  if (securityLevel < 5) return null;",
    "  for (let i = 0; i < payload.length; i++) {",
    "    hash ^= payload[i];",
    "    hash = (hash * 0x01000193) >>> 0;",
    "  }",
    "  return hash.toString(16);",
    "}",
    "class GhostProtocol extends Daemon {",
    "  constructor(config) {",
    "    super(config);",
    "    this.connect();",
    "  }",
    "  async inject(target) {",
    "    while(this.signal > 0.01) {",
    "      await this.override();",
    "      // Bypassing firewall...",
    "    }",
    "  }",
    "}",
    "const shader = `",
    "  void main() {",
    "    gl_FragColor = vec4(1.0);",
    "  }",
    "`;",
    "export default Module;",
    "if (system.overheat) {",
    "  emergency_shutdown();",
    "}",
    "// TODO: Refactor legacy kernel",
    "// SYSTEM FAILURE IMMINENT",
    "const TARGET_LOCKED = true;",
    "await neural_link.establish();"
  ];

  const keywords = ['const', 'let', 'var', 'function', 'class', 'import', 'from', 'return', 'if', 'for', 'while', 'export', 'default', 'async', 'await', 'new', 'super', 'true', 'false'];
  const types = ['Matrix', 'Vector3', 'Bytes', 'string', 'GhostProtocol', 'Daemon', 'Module', 'void', 'Promise'];

  let y = lineHeight;
  
  // Fill the canvas
  while (y < size) {
    const line = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    let x = 10;
    
    // Random indentation
    if (!line.startsWith('import') && !line.startsWith('export')) {
        x += Math.floor(Math.random() * 4) * 40; // Wider indentation
    }

    // Tokenize roughly
    const regex = /(\/\/.*|'.*'|`[\s\S]*?`|\b\w+\b|[{}();,.=<>!+\-*&|])/g;
    let match;
    let lastIndex = 0;
    
    // Draw parts
    while ((match = regex.exec(line)) !== null) {
        const text = match[0];
        const index = match.index;
        
        // Draw whitespace between tokens
        if (index > lastIndex) {
            x += ctx.measureText(line.substring(lastIndex, index)).width;
        }
        
        // Determine color
        if (text.startsWith('//')) {
            ctx.fillStyle = styles.comment;
        } else if (text.startsWith("'") || text.startsWith("`")) {
            ctx.fillStyle = styles.string;
        } else if (keywords.includes(text)) {
            ctx.fillStyle = styles.keyword;
        } else if (types.includes(text)) {
            ctx.fillStyle = styles.type;
        } else {
            ctx.fillStyle = styles.normal;
        }
        
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
        lastIndex = regex.lastIndex;
    }
    
    y += lineHeight;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipMapLinearFilter; 
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  
  return texture;
};

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
  uniform sampler2D uTex;
  uniform float uAspect;
  
  varying vec2 vUv;

  float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    
    // --- DISTORTION (Glitch) ---
    // Horizontal tearing on bass
    float noiseLine = random(vec2(0.0, floor(uv.y * 20.0) + uTime));
    float glitch = step(0.95, noiseLine) * uBass * 0.1;
    uv.x -= glitch;

    // --- MAPPING & SCROLLING ---
    // Correct aspect ratio so text isn't stretched horizontally
    vec2 texUV = uv;
    texUV.x *= uAspect; 
    
    // Scroll upwards
    float scrollSpeed = 0.15 + (uBass * 0.15); 
    texUV.y = uv.y + uTime * scrollSpeed;
    
    // Scale texture repeat to fit screen nicely
    texUV *= 1.5; 

    // --- SAMPLING ---
    vec4 texColor = texture2D(uTex, texUV);
    float brightness = texColor.r; // Grayscale font texture

    // --- SYNTAX HIGHLIGHTING MAPPING ---
    
    vec3 finalColor = vec3(0.0);
    float alpha = 1.0;

    // Use bright neon colors
    if (brightness > 0.9) { 
        // Keyword (White in texture) -> Hot Pink
        finalColor = vec3(1.0, 0.0, 0.8); 
    } else if (brightness > 0.7) { 
        // String -> Bright Yellow
        finalColor = vec3(1.0, 0.9, 0.1);
    } else if (brightness > 0.5) { 
        // Type -> Bright Cyan
        finalColor = vec3(0.0, 1.0, 1.0);
    } else if (brightness > 0.3) { 
        // Normal -> User Color (usually bright)
        finalColor = uColor;
    } else if (brightness > 0.1) { 
        // Comment -> Matrix Green
        finalColor = vec3(0.2, 0.8, 0.2);
    } else {
        // Background
        alpha = 0.0;
    }
    
    // --- POST EFFECTS ---
    
    // 1. Bass Pulse brightness
    float pulse = 1.0 + uBass * 0.8;
    finalColor *= pulse;
    
    // 2. High frequency flicker
    float flicker = 1.0 + (step(0.9, random(vec2(uTime * 30.0, uv.y))) * uHigh);
    finalColor *= flicker;

    // 3. Scanlines (Subtle)
    float scanline = 0.9 + 0.1 * sin(uv.y * 1000.0);
    finalColor *= scanline;
    
    // 4. Vignette
    float vign = smoothstep(0.0, 0.15, uv.y) * (1.0 - smoothstep(0.85, 1.0, uv.y));
    alpha *= vign;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface CodeMatrixProps {
  audioData: React.MutableRefObject<{ bass: number; mid: number; high: number }>;
  color: string;
}

export const CodeMatrix: React.FC<CodeMatrixProps> = ({ audioData, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Use viewport to fill the screen
  const { viewport } = useThree();

  // Generate texture once
  const codeTexture = useMemo(() => generateCodeTexture(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uTex: { value: codeTexture },
      uAspect: { value: 1.0 }
    }),
    [codeTexture, color]
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
      materialRef.current.uniforms.uBass.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uBass.value, bass, 0.2);
      materialRef.current.uniforms.uMid.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uMid.value, mid, 0.2);
      materialRef.current.uniforms.uHigh.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uHigh.value, high, 0.2);
      
      // Update aspect ratio based on current viewport
      materialRef.current.uniforms.uAspect.value = viewport.width / viewport.height;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Plane fills the viewport at z=0 */}
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};