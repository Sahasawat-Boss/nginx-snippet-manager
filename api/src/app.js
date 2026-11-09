import express from 'express';
import { createSnippetRepo } from './snippets.js';
import { parseId, parseIntParam, validateSnippet } from './validate.js';

function sendError(res, status, code, message, details) {
  res.status(status).json({ error: { code, message, ...(details && { details }) } });
}

function sendValidationError(res, details) {
  sendError(res, 400, 'validation_error', 'ข้อมูลไม่ถูกต้อง', details);
}

function sendNotFound(res) {
  sendError(res, 404, 'not_found', 'ไม่พบ snippet นี้');
}

export function createApp(db) {
  const repo = createSnippetRepo(db);
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/health', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  });

  app.get('/api/tags', (req, res) => {
    res.json({ data: repo.listTags() });
  });

  app.get('/api/stats', (req, res) => {
    res.json(repo.stats());
  });

  app.get('/api/snippets', (req, res) => {
    const page = parseIntParam(req.query.page, { fallback: 1, max: 1_000_000 });
    const limit = parseIntParam(req.query.limit, { fallback: 20, max: 100 });
    const details = {};
    if (page === null) details.page = 'page ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป';
    if (limit === null) details.limit = 'limit ต้องอยู่ระหว่าง 1 ถึง 100';
    if (Object.keys(details).length) return sendValidationError(res, details);

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';
    const favorite = req.query.favorite === 'true';
    res.json(repo.list({ q, tag, favorite, page, limit }));
  });

  app.get('/api/snippets/:id', (req, res) => {
    const id = parseId(req.params.id);
    const snippet = id && repo.get(id);
    if (!snippet) return sendNotFound(res);
    res.json(snippet);
  });

  app.post('/api/snippets', (req, res) => {
    const { value, errors } = validateSnippet(req.body);
    if (errors) return sendValidationError(res, errors);
    const snippet = repo.create(value);
    res.status(201).location(`/api/snippets/${snippet.id}`).json(snippet);
  });

  app.put('/api/snippets/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return sendNotFound(res);
    const { value, errors } = validateSnippet(req.body);
    if (errors) return sendValidationError(res, errors);
    const snippet = repo.update(id, value);
    if (!snippet) return sendNotFound(res);
    res.json(snippet);
  });

  app.put('/api/snippets/:id/favorite', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return sendNotFound(res);
    const favorite = req.body?.favorite;
    if (typeof favorite !== 'boolean') {
      return sendValidationError(res, { favorite: 'favorite ต้องเป็น true หรือ false' });
    }
    const snippet = repo.setFavorite(id, favorite);
    if (!snippet) return sendNotFound(res);
    res.json(snippet);
  });

  app.delete('/api/snippets/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id || !repo.remove(id)) return sendNotFound(res);
    res.status(204).end();
  });

  app.use((req, res) => {
    sendError(res, 404, 'route_not_found', 'ไม่พบ endpoint นี้');
  });

  // Express identifies error middleware by its four-argument signature.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return sendError(res, 400, 'invalid_json', 'รูปแบบ JSON ไม่ถูกต้อง');
    }
    if (err.type === 'entity.too.large') {
      return sendError(res, 413, 'payload_too_large', 'ข้อมูลมีขนาดใหญ่เกินไป');
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'เกิดข้อผิดพลาดภายในระบบ');
  });

  return app;
}
