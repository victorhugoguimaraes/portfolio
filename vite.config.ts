import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Caminhos relativos: o mesmo build funciona na raiz do domínio e numa
  // subpasta, como https://usuario.github.io/portfolio/.
  base: './',
  server: {
    port: 5273,
    strictPort: false,
  },
})
