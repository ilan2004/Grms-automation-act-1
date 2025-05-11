import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { startAutomation } from './index.ts';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../')));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// API endpoint for starting automation
app.post('/api/start-automation', async (req, res) => {
  const { username, password, apiKey } = req.body;

  if (!username || !password || !apiKey) {
    return res.status(400).json({ status: 'error', message: 'Missing required fields' });
  }

  try {
    const result = await startAutomation({ username, password, apiKey });
    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ status: 'error', message: errorMessage });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});