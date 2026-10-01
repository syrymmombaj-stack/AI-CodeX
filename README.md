# AI CodeX

An independent AI coding workspace and installable progressive web app. Generate, improve, debug or explain code; edit and preview HTML; import/export source files; save projects on your device.

## Run

Requires Node.js 20 or newer. Run `npm ci`, copy `.env.example` to `.env`, set your server-side `OPENAI_API_KEY`, and run `npm start`. Open http://localhost:3000. Without a key the editor still works and the API returns a helpful setup message.

`OPENAI_MODEL` defaults to `gpt-4.1-mini`; set it to an API model your account can access. If the previous deployment uses `gpt-5.6-luna`, update that environment variable to an available API model. API billing is separate from a ChatGPT subscription.

## Hosting and installation

Deploy as a Node web service with build command `npm ci` and start command `npm start`. The server binds to `0.0.0.0` and uses the host's `PORT`. Set the AI key in the hosting provider's secret environment variables, never in the browser or repository. Serve over HTTPS to enable PWA installation. Chrome/Edge show Install app when eligible; on iPhone use Safari's Share → Add to Home Screen.

The same Node service serves frontend and API, so no cross-origin setup is needed. GitHub Pages alone cannot run this backend. If you host the frontend separately, enter the Node backend URL in Settings and add the frontend origin to the server's `FRONTEND_ORIGIN` (comma-separated origins supported).

Optional `APP_ACCESS_TOKEN` restricts AI requests to people with a workspace token. Enter that token in Settings; it is retained for the browser session. This is a simple private workspace gate, not a multi-user authentication system. Rate limiting is per-process and per IP; a multi-instance public service needs a shared limiter and individual accounts. Set `TRUST_PROXY=1` only behind exactly one trusted proxy.

## Storage and offline mode

Projects and theme are saved in this browser's local storage; they do not sync across devices. Export important code. The service worker caches only public application assets; API responses and prompts are never cached. The editor can open offline after the first visit; AI generation needs a connection and a configured, funded API account. Preview executes HTML/JS in a sandboxed iframe. Python and other languages can be exported; they are not executed on the server.

## Validation

`npm test` checks startup without secrets, protected server files, validation, provider failure handling, empty/truncated results, origin rules, access tokens and rate limits. Real provider calls need a configured API key and balance.
