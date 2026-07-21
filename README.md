# LLM Chat Hub

A minimal chat frontend that talks to any **OpenAI-compatible** LLM API — not tied to one provider. Point it at [NVIDIA NIM](https://build.nvidia.com/models) (100+ hosted models), OpenAI, OpenRouter, Groq, or anything else that speaks the `/v1/models` + `/v1/chat/completions` protocol, just by changing `API_BASE_URL`. Pick a model from a searchable dropdown and chat — no database, conversation history is kept in the browser (`localStorage`), and there's a light/dark mode toggle.

## How it works

- `src/lib/api.ts` — reads `API_BASE_URL` and `API_KEY` from the environment.
- `src/app/api/models/route.ts` — server-side route that lists available models from `{API_BASE_URL}/models`, cached in memory for 5 minutes.
- `src/app/api/chat/route.ts` — server-side route that proxies chat requests to `{API_BASE_URL}/chat/completions` with streaming, so the API key never reaches the browser.
- `src/app/page.tsx` — chat UI: searchable model dropdown, streaming message rendering, theme toggle, "New chat" button.

## Setup

1. Get an API key from whichever provider you want to use (e.g. [build.nvidia.com](https://build.nvidia.com) → "Get API Key" on any model page).
2. Copy `.env.example` to `.env.local` and fill it in:
   ```bash
   cp .env.example .env.local
   ```
   ```
   API_BASE_URL=https://integrate.api.nvidia.com/v1
   API_KEY=your-key-here
   ```
3. Install dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

## Deploying on Zeabur

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Zeabur, create a new service from this GitHub repo — it auto-detects Next.js.
3. In the service's **Variables** tab, add `API_BASE_URL` and `API_KEY`.
4. Deploy. Zeabur will run `npm install` and `npm run build` / `npm run start` automatically.

## Notes

- This is a single-user tool: the API key lives only on the server, and conversations are stored per-browser. There's no auth, so anyone with the deployed URL can use it and spend your API quota — keep the URL private, or add auth later if you share it more broadly.
- To support multiple users with persistent, cross-device history later, add a database (e.g. Postgres on Zeabur) plus a users/conversations/messages schema and simple auth.
