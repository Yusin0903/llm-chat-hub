# LLM Chat Hub

A minimal chat frontend that talks to any model exposed via the [NVIDIA NIM API](https://build.nvidia.com/models) (100+ hosted LLMs, OpenAI-compatible). Pick a model from a searchable dropdown and chat — no database, conversation history is kept in the browser (`localStorage`).

## How it works

- `src/app/api/models/route.ts` — server-side route that lists available models from NIM's `/v1/models`, cached in memory for 5 minutes.
- `src/app/api/chat/route.ts` — server-side route that proxies chat requests to NIM's `/v1/chat/completions` with streaming, so the API key never reaches the browser.
- `src/app/page.tsx` — chat UI: searchable model dropdown, streaming message rendering, "New chat" button.

## Setup

1. Get an API key from [build.nvidia.com](https://build.nvidia.com) (Get API Key on any model page).
2. Copy `.env.example` to `.env.local` and set your key:
   ```bash
   cp .env.example .env.local
   ```
   ```
   NVIDIA_API_KEY=nvapi-...
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
3. In the service's **Variables** tab, add `NVIDIA_API_KEY` with your key.
4. Deploy. Zeabur will run `npm install` and `npm run build` / `npm run start` automatically.

## Notes

- This is a single-user tool: the API key lives only on the server, and conversations are stored per-browser. There's no auth, so anyone with the deployed URL can use it and spend your API quota — keep the URL private, or add auth later if you share it more broadly.
- To support multiple users with persistent, cross-device history later, add a database (e.g. Postgres on Zeabur) plus a users/conversations/messages schema and simple auth.
