import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Use root path for Cloudflare Workers
  server: {
    host: true
  },
  build: {
    target: 'esnext',
    sourcemap: false, // Disable sourcemaps for production to save space
    outDir: 'dist',
    assetsDir: 'assets', // Explicitly set assets directory
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/postprocessing']
        }
      }
    },
    chunkSizeWarningLimit: 1600
  }
});