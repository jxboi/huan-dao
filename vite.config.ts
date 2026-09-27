import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` keeps the build portable (GitHub Pages, any static host, file preview).
export default defineConfig({
  base: './',
  // NEXT_PUBLIC_* so the env vars Vercel's Supabase integration provisions reach the client as-is.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
