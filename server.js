import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp({ env = process.env, client, rateLimit = 20 } = {}) {
  const app = express();
  const configured = Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_key_here');
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const ai = client || (configured ? new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 60000, maxRetries: 0 }) : null);
  const origins = (env.FRONTEND_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); res.set('Referrer-Policy', 'no-referrer'); next(); });
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}` && !origins.includes(origin))
      return res.status(403).json({ error: 'This origin is not allowed.' });
    next();
  });
  app.use(cors({ origin: origins.length ? origins : false }));
  app.use(express.json({ limit: '150kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, aiConfigured: Boolean(ai), service: 'AI CodeX API' }));
  const requests = new Map();
  app.post('/api/generate', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { prompt, language = 'HTML / CSS / JS', currentCode = '', mode = 'generate' } = req.body || {};
    const languages = ['HTML / CSS / JS', 'Python', 'JavaScript', 'TypeScript', 'React', 'Java', 'C++', 'SQL'];
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000)
      return res.status(400).json({ error: 'Enter a prompt of 1–8,000 characters.' });
    if (typeof currentCode !== 'string' || currentCode.length > 60000)
      return res.status(400).json({ error: 'Code must be text, up to 60,000 characters.' });
    if (!languages.includes(language) || !['generate', 'explain', 'improve', 'debug'].includes(mode))
      return res.status(400).json({ error: 'Choose a supported language and action.' });
    if (env.APP_ACCESS_TOKEN && req.get('x-app-token') !== env.APP_ACCESS_TOKEN)
      return res.status(401).json({ error: 'Enter the workspace access token in Settings.' });
    if (!ai) return res.status(503).json({ error: 'AI is not configured. The owner must set OPENAI_API_KEY on the server.' });
    const now = Date.now();
    for (const [key, value] of requests) if (now - value.start >= 60000) requests.delete(key);
    const key = req.ip;
    const usage = requests.get(key) || { start: now, count: 0 };
    if (usage.count >= rateLimit) { res.set('Retry-After', '60'); return res.status(429).json({ error: 'Too many requests. Try again in a minute.' }); }
    usage.count++; requests.set(key, usage);
    try {
      const response = await ai.responses.create({
        model, store: false, max_output_tokens: 8000,
        instructions: mode === 'explain' ? 'You are AI CodeX. Explain the supplied code clearly in plain text. Do not replace or rewrite the code.' : 'You are AI CodeX, a coding assistant. Return only complete source code without Markdown fences or commentary. For HTML requests return a self-contained HTML document. Follow the requested generate, improve or debug action.',
        input: `Action: ${mode}\nLanguage: ${language}\nRequest: ${prompt.trim()}\nExisting code:\n${currentCode}`
      });
      if (response.status === 'incomplete') return res.status(502).json({ error: 'The result exceeded the output limit. Ask for a smaller change.' });
      if (!response.output_text?.trim()) return res.status(502).json({ error: 'AI returned no text. Try a different request.' });
      res.json(mode === 'explain' ? { explanation: response.output_text, model } : { code: response.output_text, model });
    } catch (error) {
      console.error('AI generation failed', { status: error.status, code: error.code, name: error.name });
      let status = 502, message = 'AI provider is unavailable. Please try again.';
      if (error.status === 401) { status = 503; message = 'The server AI key is invalid. The owner must update it.'; }
      else if (error.status === 429) { status = 429; message = error.code === 'insufficient_quota' ? 'The AI provider balance or quota is exhausted. The owner must check API billing.' : 'The AI provider is busy. Try again shortly.'; }
      else if (error.status === 404 || error.status === 400) { status = 503; message = 'The configured AI model or request is unavailable. The owner must check OPENAI_MODEL.'; }
      else if (error.name === 'APIConnectionTimeoutError') { status = 504; message = 'AI took too long. Try a smaller request.'; }
      res.status(status).json({ error: message });
    }
  });
  const files = ['index.html', 'app.js', 'styles.css', 'favicon.svg', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png'];
  app.get('/', (_req, res) => res.sendFile(path.join(root, 'index.html')));
  for (const file of files) app.get(`/${file}`, (_req, res) => { if (file === 'sw.js') res.set('Cache-Control', 'no-cache'); res.sendFile(path.join(root, file)); });
  app.use((req, res) => req.path.startsWith('/api/') ? res.status(404).json({ error: 'API endpoint not found.' }) : res.sendStatus(404));
  app.use((error, _req, res, _next) => res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? 'Request is too large.' : 'Invalid JSON request.' }));
  return app;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, '0.0.0.0', () => console.log(`AI CodeX running on port ${port}`));
}
