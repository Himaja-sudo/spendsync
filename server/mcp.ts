import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { addExpense, addExpenses, deleteExpense, listExpenses, summarize, updateExpense } from "./db";
import { expenseInput, expenseShape, expenseUpdate, filterShape, updateShape } from "./schemas";

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const fail = (message: string) => ({
  isError: true,
  content: [{ type: "text" as const, text: message }],
});

/** A fresh server per request (stateless transport). */
export function buildMcpServer() {
  const server = new McpServer(
    { name: "spendsync", version: "1.0.0" },
    {
      instructions:
        "SpendSync stores a team's business expenses. You do the reading and reasoning " +
        "(e.g. extracting fields from receipt photos or pasted statements); call these tools " +
        "to save, edit and summarise expenses. Ask the user if the amount or date is unclear " +
        "rather than guessing. Use today's date when the user says 'today'.",
    }
  );

  server.registerTool(
    "add_expense",
    {
      title: "Add expense",
      description:
        "Save one business expense. If the user shares a receipt image or text, extract merchant, " +
        "total amount, currency, date and a sensible category yourself, then call this. " +
        "Status defaults to 'pending' (awaiting approval).",
      inputSchema: expenseShape,
    },
    async (args) => {
      const parsed = expenseInput.safeParse(args);
      if (!parsed.success) return fail(parsed.error.message);
      return ok({ created: addExpense(parsed.data, "claude") });
    }
  );

  server.registerTool(
    "add_expenses_bulk",
    {
      title: "Add many expenses",
      description:
        "Save several expenses at once, e.g. from a pasted card statement or multiple receipts. Max 50.",
      inputSchema: { expenses: z.array(z.object(expenseShape)).min(1).max(50) },
    },
    async ({ expenses }) => {
      const parsed = z.array(expenseInput).safeParse(expenses);
      if (!parsed.success) return fail(parsed.error.message);
      const created = addExpenses(parsed.data, "claude");
      return ok({ createdCount: created.length, created });
    }
  );

  server.registerTool(
    "list_expenses",
    {
      title: "List expenses",
      description: "List saved expenses, newest first, with optional filters. Returns ids needed for update/delete.",
      inputSchema: filterShape,
      annotations: { readOnlyHint: true },
    },
    async (args) => ok(listExpenses(args))
  );

  server.registerTool(
    "update_expense",
    {
      title: "Update expense",
      description:
        "Change fields of an existing expense by id (get ids from list_expenses). " +
        "Also used to approve, reject or mark an expense reimbursed via 'status'.",
      inputSchema: { id: z.string().describe("Expense id"), ...updateShape },
    },
    async ({ id, ...patch }) => {
      const parsed = expenseUpdate.safeParse(patch);
      if (!parsed.success) return fail(parsed.error.message);
      const updated = updateExpense(id, parsed.data);
      return updated ? ok({ updated }) : fail(`No expense with id ${id}`);
    }
  );

  server.registerTool(
    "delete_expense",
    {
      title: "Delete expense",
      description: "Permanently delete an expense by id. Confirm with the user first.",
      inputSchema: { id: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ id }) => (deleteExpense(id) ? ok({ deleted: id }) : fail(`No expense with id ${id}`))
  );

  server.registerTool(
    "get_summary",
    {
      title: "Spending summary",
      description:
        "Computed totals (per currency): overall total, count, average, breakdown by category, " +
        "month and status, and top merchants. Write the narrative summary yourself from these numbers.",
      inputSchema: filterShape,
      annotations: { readOnlyHint: true },
    },
    async (args) => ok(summarize(args))
  );

  return server;
}
