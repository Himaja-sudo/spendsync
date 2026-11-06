import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildMcpServer } from "./server/mcp";
import {
  addExpense, deleteExpense, listExpenses, summarize, updateExpense,
} from "./server/db";
import { expenseInput, expenseUpdate, filterSchema } from "./server/schemas";

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === "production";
const MCP_TOKEN = process.env.MCP_TOKEN ?? "";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------------- REST API used by the React UI ---------------- */

app.get("/api/expenses", (req, res) => {
  const f = filterSchema.safeParse(req.query);
  if (!f.success) return res.status(400).json({ error: f.error.message });
  res.json(listExpenses(f.data));
});

app.post("/api/expenses", (req, res) => {
  const p = expenseInput.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.message });
  res.status(201).json(addExpense(p.data, "manual"));
});

app.patch("/api/expenses/:id", (req, res) => {
  const p = expenseUpdate.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.message });
  const row = updateExpense(req.params.id, p.data);
  row ? res.json(row) : res.status(404).json({ error: "Not found" });
});

app.delete("/api/expenses/:id", (req, res) => {
  deleteExpense(req.params.id) ? res.status(204).end() : res.status(404).json({ error: "Not found" });
});

app.get("/api/summary", (req, res) => {
  const f = filterSchema.safeParse(req.query);
  if (!f.success) return res.status(400).json({ error: f.error.message });
  res.json(summarize(f.data));
});

/* ---------------- MCP endpoint (Claude connects here) ---------------- */
// URL to give Claude:  https://<your-domain>/mcp/<MCP_TOKEN>
// If MCP_TOKEN is empty, plain /mcp is open (fine for local testing only).

function tokenOk(given: string | undefined): boolean {
  if (!MCP_TOKEN) return true;
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(MCP_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

function guard(req: Request, res: Response, next: NextFunction) {
  if (tokenOk(req.params.token)) return next();
  res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null });
}

async function handleMcp(req: Request, res: Response) {
  try {
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP error", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
}

const notAllowed = (_req: Request, res: Response) =>
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });

app.post(["/mcp", "/mcp/:token"], guard, handleMcp);
app.get(["/mcp", "/mcp/:token"], notAllowed);
app.delete(["/mcp", "/mcp/:token"], notAllowed);

/* ---------------- Frontend ---------------- */

async function start() {
  if (IS_PROD) {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SpendSync on http://localhost:${PORT}`);
    console.log(`MCP endpoint: /mcp${MCP_TOKEN ? "/<MCP_TOKEN>" : " (no token set)"}`);
  });
}

start();
