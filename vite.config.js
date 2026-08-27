import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        // three e gsap pesano: in chunk separati restano in cache fra i deploy.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
          return undefined;
        }
      }
    }
  },
  server: { host: true, port: 5173 }
});
