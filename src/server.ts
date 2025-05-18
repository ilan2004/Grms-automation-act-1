import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { startAutomation } from './index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

interface AutomationRequest {
  username: string;
  password: string;
  apiKey: string;
}

app.use(cors({
  origin: 'http://localhost',
  methods: ['GET', 'POST']
}));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  console.log('[SERVER] Health check requested');
  res.json({ status: 'ok', port: process.env.PORT || 3132 });
});

app.post('/api/start-automation', (req, res) => {
  console.log('[SERVER] Received automation request:', req.body);
  const { username, password, apiKey } = req.body as AutomationRequest;
  
  if (!username || !password || !apiKey) {
    console.error('[SERVER] Missing required fields');
    return res.status(400).json({ 
      status: 'error', 
      message: 'Missing required fields' 
    });
  }
  
  startAutomation({ username, password, apiKey })
    .then(result => {
      console.log('[SERVER] Automation result:', result);
      res.json(result);
    })
    .catch(error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SERVER] Automation error:', errorMessage);
      res.status(500).json({ 
        status: 'error', 
        message: errorMessage 
      });
    });
});

const PORT = process.env.PORT || 3132;
app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
}).on('error', (err) => {
  console.error('[SERVER] Failed to start:', err);
  if ((err as { code?: string }).code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${PORT} is in use. Please close other applications.`);
  }
});