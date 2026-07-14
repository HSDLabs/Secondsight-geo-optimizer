import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import analyzeRoutes from './routes/analyze.js';
import aiVisibilityRoutes from './routes/aiVisibility.js';
import crawlerRoutes from './routes/crawler.js';
import externalIntelligenceRoutes from './routes/externalIntelligence.js';
import settingsRoutes from './routes/settings.js';
import { assertSingleProcessMemoryStore } from './services/externalIntelligence/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env') }); 
dotenv.config(); // root .env if present

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/analyze', analyzeRoutes);
app.use('/api/ai-visibility', aiVisibilityRoutes);
app.use('/api/crawler', crawlerRoutes);
assertSingleProcessMemoryStore();

app.use('/api/external-intelligence', externalIntelligenceRoutes);
app.use('/api/settings', settingsRoutes);

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`SCRAPEBADGER_API_KEY: ${Boolean(process.env.SCRAPEBADGER_API_KEY)}`);
  console.log(`GOOGLE_API_KEY: ${Boolean(process.env.GOOGLE_API_KEY)}`);
  console.log(`CHATGPT_API_KEY: ${Boolean(process.env.CHATGPT_API_KEY)}`);
});

export default server;
