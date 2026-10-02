import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-ui': ['lucide-react', 'react-hot-toast', '@headlessui/react'],
          'vendor-date': ['date-fns'],
          'vendor-dropzone': ['react-dropzone'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
})
