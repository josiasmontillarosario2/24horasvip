// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel({
    // Opciones específicas para el adaptador de Vercel
    imagesConfig: {
      sizes: [640, 750, 828, 1080, 1200, 1920],
      domains: ['www.telemundo.com'], // Dominios permitidos para imágenes
    },
    // Opcional: configuración específica para el edge runtime
    edgeMiddleware: true,
    // Extensiones de archivo para incluir en el empaquetado edge
    includeFiles: ['**/*.{jpg,png,svg,woff,woff2}'],
  }),
});