import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionsRouter } from './routes/sessions.js';
import { toolsRouter } from './routes/tools.js';
import { configRouter } from './routes/config.js';
import { filesRouter } from './routes/files.js';
import { gitRouter } from './routes/git.js';
import { handleWebSocket } from './wsHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Serve built frontend in production
const webDist = path.join(__dirname, '../../web/dist');
app.use(express.static(webDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

wss.on('connection', (ws) => {
  handleWebSocket(ws);
});

const PORT = parseInt(process.env.PORT ?? '3000', 10);
server.listen(PORT, () => {
  console.log(`DvalinCode server: http://localhost:${PORT}`);
});
