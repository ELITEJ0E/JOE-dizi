import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import sunoAudioHandler from './api/suno-audio';
import sunoRightsHandler from './api/suno-rights';

// AI Studio runs a Vite development server. Serve the same first-party audio
// handlers there that the production Vercel deployment exposes via /api.
const localAudioApi = () => ({
  name: 'local-audio-api',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/suno-audio') && !req.url?.startsWith('/api/suno-rights')) return next();
      const url = new URL(req.url, 'http://localhost');
      const query = Object.fromEntries(url.searchParams.entries());
      const pathClipId = /^\/api\/suno-(?:audio|rights)\/([\w-]+)$/.exec(url.pathname)?.[1];
      if (pathClipId) query.clipId = pathClipId;
      const reply = {
        status(code: number) { res.statusCode = code; return this; },
        setHeader(name: string, value: string) { res.setHeader(name, value); },
        json(body: object) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); },
        end(data?: Buffer) { res.end(data); },
      };
      try {
        if (url.pathname === '/api/suno-audio' || url.pathname.startsWith('/api/suno-audio/')) await sunoAudioHandler({ method: req.method, query, headers: { range: req.headers.range } }, reply);
        else if (url.pathname === '/api/suno-rights' || url.pathname.startsWith('/api/suno-rights/')) await sunoRightsHandler({ method: req.method, query }, reply);
        else next();
      } catch (error) { next(error); }
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localAudioApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Same extraction backend used by JOE-Music, for local AI Studio preview.
      proxy: {
        '/api/youtube': {
          target: process.env.VITE_EXTRACTOR_API || 'https://chord-extractor-1.onrender.com',
          changeOrigin: true,
          rewrite: (url: string) => url.replace(/^\/api\/youtube/, ''),
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
