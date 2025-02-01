import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,      // Specify the port
        strictPort: true, // Ensure the port is always 3000
    },
    base: './', // Required for GitHub Pages deployment
});