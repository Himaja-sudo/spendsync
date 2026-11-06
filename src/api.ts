// Drop-in client for the SpendSync backend. Replace your in-memory / localStorage
// expense state with these calls so Claude-created data shows up in the UI.

export type Status = "pending" | "approved" | "rejected" | "reimbursed";

export interface Expense {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // YYYY-MM-DD
  notes: string;
  status: Status;
  source: "claude" | "manual"; // show a "Created by Claude" badge when "claude"
  created_at: string;
}

export type NewExpense = Omit<Expense, "id" | "source" | "created_at" | "notes" | "status"> &
  Partial<Pick<Expense, "notes" | "status">>;

export interface Summary {
  expenseCount: number;
  byCurrency: Record<
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
  >;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
  return res.status === 204 ? (undefined as T) : res.json();
}

const qs = (o: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const api = {
  list: (filters: Record<string, string | undefined> = {}) =>
    req<Expense[]>(`/api/expenses${qs(filters)}`),
  create: (e: NewExpense) =>
    req<Expense>("/api/expenses", { method: "POST", body: JSON.stringify(e) }),
  update: (id: string, patch: Partial<Omit<Expense, "id" | "source" | "created_at">>) =>
    req<Expense>(`/api/expenses/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => req<void>(`/api/expenses/${id}`, { method: "DELETE" }),
  summary: (filters: Record<string, string | undefined> = {}) =>
    req<Summary>(`/api/summary${qs(filters)}`),
};

// Claude adds expenses outside the browser, so poll (or refetch on window focus).
export function pollExpenses(onData: (rows: Expense[]) => void, ms = 4000) {
  let stop = false;
  const tick = async () => {
    try { if (!stop) onData(await api.list()); } catch { /* ignore */ }
    if (!stop) setTimeout(tick, ms);
  };
  tick();
  return () => { stop = true; };
}
