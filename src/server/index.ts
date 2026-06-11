import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { sessionsRouter } from './routes/sessions.js';
import { toolsRouter } from './routes/tools.js';
import { configRouter } from './routes/config.js';
import { filesRouter } from './routes/files.js';
import { gitRouter } from './routes/git.js';
import { getPlaybook, savePlaybook } from './playbookHandler.js';
import { handleWebSocket } from './wsHandler.js';

const __serverDir = path.dirname(fileURLToPath(import.meta.url));

// Dev mode: __serverDir is src/server/ → tsconfig.json is 2 levels up
// Compiled binary: __serverDir is the install dir → no tsconfig.json above
const isDev = existsSync(path.join(__serverDir, '../../tsconfig.json'));
const webDist = isDev
  ? path.join(__serverDir, '../../web/dist')
  : path.join(__serverDir, 'web', 'dist');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/config', configRouter);
app.use('/api/files', filesRouter);
app.use('/api/git', gitRouter);
app.get('/api/playbook', (req, res) => void getPlaybook(req, res));
app.post('/api/playbook', (req, res) => void savePlaybook(req, res));

// Serve built frontend
app.use(express.static(webDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

wss.on('connection', (ws) => {
  handleWebSocket(ws);
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`DvalinCode  →  ${url}`);

  // Auto-open browser when running as a compiled release binary
  if (!isDev && process.env.DVALINCODE_NO_OPEN !== '1') {
    const cmd =
      process.platform === 'darwin' ? `open "${url}"` :
      process.platform === 'win32'  ? `start "" "${url}"` :
                                       `xdg-open "${url}"`;
    exec(cmd, () => { /* ignore errors */ });
  }
});
