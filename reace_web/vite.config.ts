import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self' data: blob: http: https: ws: wss: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none';",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // The Excel editor is already route-level lazy loaded and ships with the
    // Univer spreadsheet engine. Its dedicated chunk is expected to exceed the
    // default 500 kB warning threshold, so raise the threshold to keep real
    // build regressions actionable.
    chunkSizeWarningLimit: 5500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@univerjs/preset-sheets-core/locales')) {
            return 'univer-locales';
          }
          if (id.includes('@univerjs/preset-sheets-core')) {
            return 'univer-sheets-core';
          }
          if (id.includes('@univerjs/presets')) {
            return 'univer-presets';
          }
          if (id.includes('react-router') || id.includes('react-dom') || id.includes(`${path.sep}react${path.sep}`)) {
            return 'react-vendor';
          }
          if (id.includes('motion')) {
            return 'motion-vendor';
          }
          if (id.includes('recharts')) {
            return 'chart-vendor';
          }
          if (id.includes('react-dnd')) {
            return 'dnd-vendor';
          }
          if (
            id.includes('@radix-ui') ||
            id.includes('@mui') ||
            id.includes('lucide-react') ||
            id.includes('sonner') ||
            id.includes('@emotion') ||
            id.includes('class-variance-authority') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('vaul')
          ) {
            return 'ui-vendor';
          }
        },
      },
    },
  },
  server: {
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
