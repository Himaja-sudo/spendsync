# SpendSync

Expense tracking and reimbursement for teams. **There is no AI inside this app.** Claude (the customer's own plan) reads receipts and writes summaries, then calls this app's MCP tools. SpendSync stores the data, lets people edit and approve it, and stays live after the chat ends.

```
You in Claude: "Log this receipt"  ->  Claude extracts the fields  ->  MCP tool call
   ->  SpendSync saves it (SQLite)  ->  you open the web UI, review, edit, approve
```

## Run locally

```bash
npm install
cp _env.example .env      # rename: the dotfile is .env
npm run dev               # http://localhost:3000
```

Production: `npm run build && npm start`.

## Connect to Claude

MCP URL: `https://<your-domain>/mcp/<MCP_TOKEN>`

1. Open Claude (claude.ai) and go to **Settings -> Connectors -> Add custom connector**.
2. Name it `SpendSync` and paste the MCP URL above.
3. Start a new chat, enable the connector, and try:
   - "Log a 850 INR Uber ride from yesterday under Travel."
   - Attach a receipt photo: "Add this to SpendSync."
   - "Summarise my spending this month and list anything still pending."
4. Open the web app to see the entries (marked as created by Claude) and edit, approve or reject them.

To test locally before deploying, expose the port with a tunnel (`ngrok http 3000`) and use the HTTPS URL it gives you.

## MCP tools

| Tool | What it does |
|---|---|
| `add_expense` | Save one expense |
| `add_expenses_bulk` | Save up to 50 at once (statements, several receipts) |
| `list_expenses` | Filter by date, category, status, search text |
| `update_expense` | Edit fields or set status (pending / approved / rejected / reimbursed) |
| `delete_expense` | Remove an expense |
| `get_summary` | Totals by category, month, status and top merchants (computed in code) |

## Deploy (Render / Railway / Fly)

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Env vars: `MCP_TOKEN` (long random string), `DB_PATH` (path on a persistent disk, e.g. `/data/spendsync.db`)
- Without a persistent disk the SQLite file is wiped on redeploy.

## Notes

- The MCP URL contains a secret token, so treat it like a password. OAuth would be the next step for multi-tenant use.
- Money is grouped per currency in summaries and never mixed.
