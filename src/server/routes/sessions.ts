import { Router } from 'express';
import { listSessions, loadSession, deleteSession } from '../../sessions/store.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', async (_req, res) => {
  const sessions = await listSessions();
  res.json(
    sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      cwd: s.cwd,
      goal: s.goal,
      summary: s.summary,
      messageCount: s.messages.length,
    })),
  );
});

sessionsRouter.get('/:id', async (req, res) => {
  const session = await loadSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
});

sessionsRouter.delete('/:id', async (req, res) => {
  await deleteSession(req.params.id);
  res.json({ ok: true });
});
