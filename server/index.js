import express from 'express';
import cors from 'cors';

import analyzeRoutes from './routes/analyze.js';
import crawlerRoutes from './routes/crawler.js';
import externalWebRoutes from './routes/externalWeb.js';
import settingsRoutes from './routes/settings.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/analyze', analyzeRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/externalWeb', externalWebRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(3001, () => {
  console.log('Server is running on port 3001');
});