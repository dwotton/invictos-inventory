import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The app calls /api/...; in development those go to the Invictos server.
    proxy: { '/api': 'http://localhost:8787' },
  },
});
