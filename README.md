# SpendSync

Corporate expense and reimbursement tracker with a Claude MCP server.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000.

## Render deployment

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables: `MCP_TOKEN` (set a long random secret)
- Optional: `DB_PATH` (defaults to `./data/spendsync.db`)

**Storage note:** SQLite on Render's free filesystem is temporary. Data may be lost on restart, spin-down, or redeploy. Add a persistent disk or migrate to a hosted database before relying on long-term expense storage.

## Claude MCP

After deployment, configure Claude with:

`https://YOUR-RENDER-SERVICE.onrender.com/mcp/YOUR_MCP_TOKEN`

Treat the token as a password. Do not commit `.env`.

## Important integration note

The current React screen still manages expenses in browser-side React state. The backend REST API and MCP tools are present, but the UI has not yet been wired to `/api/expenses` and `/api/summary`. That connection must be completed and tested before the assignment demo can show Claude-created expenses in the dashboard.
