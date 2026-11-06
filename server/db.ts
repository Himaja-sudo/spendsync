import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ExpenseInput, ExpenseUpdate, Filters } from "./schemas";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "spendsync.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id         TEXT PRIMARY KEY,
    merchant   TEXT NOT NULL,
    amount     REAL NOT NULL,
    currency   TEXT NOT NULL DEFAULT 'INR',
    category   TEXT NOT NULL,
    date       TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending',
    source     TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
`);

export type Source = "claude" | "manual";

export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  notes: string;
  status: string;
  source: Source;
  created_at: string;
}

export function listExpenses(f: Filters = {}): Expense[] {
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (f.from) { where.push("date >= @from"); params.from = f.from; }
  if (f.to) { where.push("date <= @to"); params.to = f.to; }
  if (f.category) { where.push("LOWER(category) = LOWER(@category)"); params.category = f.category; }
  if (f.status) { where.push("status = @status"); params.status = f.status; }
  if (f.search) {
    where.push("(merchant LIKE @q OR notes LIKE @q)");
    params.q = `%${f.search}%`;
  }
  const sql =
    "SELECT * FROM expenses" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY date DESC, created_at DESC";
  return db.prepare(sql).all(params) as Expense[];
}

export function getExpense(id: string): Expense | undefined {
  return db.prepare("SELECT * FROM expenses WHERE id = ?").get(id) as Expense | undefined;
}

export function addExpense(input: ExpenseInput, source: Source): Expense {
  const row: Expense = {
    id: randomUUID(),
    merchant: input.merchant,
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    category: input.category,
    date: input.date,
    notes: input.notes ?? "",
    status: input.status,
    source,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO expenses (id, merchant, amount, currency, category, date, notes, status, source, created_at)
     VALUES (@id, @merchant, @amount, @currency, @category, @date, @notes, @status, @source, @created_at)`
  ).run(row);
  return row;
}

export function addExpenses(inputs: ExpenseInput[], source: Source): Expense[] {
  const tx = db.transaction((items: ExpenseInput[]) => items.map((i) => addExpense(i, source)));
  return tx(inputs);
}

const UPDATABLE = ["merchant", "amount", "currency", "category", "date", "notes", "status"] as const;

export function updateExpense(id: string, patch: ExpenseUpdate): Expense | undefined {
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const key of UPDATABLE) {
    const v = patch[key];
    if (v !== undefined) {
      sets.push(`${key} = @${key}`);
      params[key] = key === "currency" ? String(v).toUpperCase() : v;
    }
  }
  if (sets.length) db.prepare(`UPDATE expenses SET ${sets.join(", ")} WHERE id = @id`).run(params);
  return getExpense(id);
}

export function deleteExpense(id: string): boolean {
  return db.prepare("DELETE FROM expenses WHERE id = ?").run(id).changes > 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Plain aggregation, no AI. Grouped per currency so amounts are never mixed. */
export function summarize(f: Filters = {}) {
  const rows = listExpenses(f);
  const out: Record<
    string,
    {
      total: number;
      count: number;
      average: number;
      byCategory: Record<string, number>;
      byMonth: Record<string, number>;
      byStatus: Record<string, number>;
      topMerchants: { merchant: string; total: number }[];
    }
  > = {};
  const merchants: Record<string, Record<string, number>> = {};

  for (const r of rows) {
    const c = (out[r.currency] ??= {
      total: 0, count: 0, average: 0,
      byCategory: {}, byMonth: {}, byStatus: {}, topMerchants: [],
    });
    c.total += r.amount;
    c.count += 1;
    c.byCategory[r.category] = (c.byCategory[r.category] ?? 0) + r.amount;
    const month = r.date.slice(0, 7);
    c.byMonth[month] = (c.byMonth[month] ?? 0) + r.amount;
    c.byStatus[r.status] = (c.byStatus[r.status] ?? 0) + r.amount;
    const m = (merchants[r.currency] ??= {});
    m[r.merchant] = (m[r.merchant] ?? 0) + r.amount;
  }

  for (const [cur, c] of Object.entries(out)) {
    c.average = round2(c.total / c.count);
    c.total = round2(c.total);
    for (const group of [c.byCategory, c.byMonth, c.byStatus]) {
      for (const k of Object.keys(group)) group[k] = round2(group[k]);
    }
    c.topMerchants = Object.entries(merchants[cur])
      .map(([merchant, total]) => ({ merchant, total: round2(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }
  return { filters: f, expenseCount: rows.length, byCurrency: out };
}
