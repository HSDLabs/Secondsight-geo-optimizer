import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import analyzeRoutes from './routes/analyze.js';
import crawlerRoutes from './routes/crawler.js';
import externalWebRoutes from './routes/externalWeb.js';
import settingsRoutes from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env vars. dotenv NEVER overrides variables already present in
// process.env, so real Railway Variables always win over any .env file.
// Locally this loads server/.env (and a root .env if present). On Railway
// neither file exists, so Railway's injected process.env is used as-is.
dotenv.config({ path: path.join(__dirname, '.env') }); // server/.env (local dev)
dotenv.config(); // root .env if present

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/analyze', analyzeRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/externalWeb', externalWebRoutes);
app.use('/api/settings', settingsRoutes);

// Serve the built React app in production (Railway). In dev, Vite handles
// the frontend and proxies /api to this server, so this is skipped.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log('=== SecondSight server startup ===');
  console.log('PORT: ' + PORT);
  console.log('NODE_ENV: ' + (process.env.NODE_ENV || 'undefined'));
  console.log('SCRAPEBADGER_API_KEY: ' + Boolean(process.env.SCRAPEBADGER_API_KEY));
  console.log('GOOGLE_API_KEY: ' + Boolean(process.env.GOOGLE_API_KEY));
  console.log('CHATGPT_API_KEY: ' + Boolean(process.env.CHATGPT_API_KEY));
  console.log('Server listening on port ' + PORT);
  console.log('===================================');
});
