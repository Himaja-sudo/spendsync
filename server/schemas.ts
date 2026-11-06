import { z } from "zod";

export const STATUSES = ["pending", "approved", "rejected", "reimbursed"] as const;
export type Status = (typeof STATUSES)[number];

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

// Raw shapes are reused by both the REST API and the MCP tools.
export const expenseShape = {
  merchant: z.string().min(1).describe("Vendor or merchant name, e.g. 'Uber', 'Starbucks'"),
  amount: z.number().positive().describe("Total amount paid, as a plain number"),
  currency: z.string().length(3).default("INR").describe("ISO 4217 code, e.g. INR, USD"),
  category: z
    .string()
    .min(1)
    .describe("Travel, Meals, Accommodation, Software, Office, Fuel, Entertainment, Other"),
  date: date.describe("Date of the expense, YYYY-MM-DD"),
  notes: z.string().optional().describe("Optional note, e.g. business purpose"),
  status: z.enum(STATUSES).default("pending").describe("Reimbursement status"),
};

export const expenseInput = z.object(expenseShape);
export type ExpenseInput = z.infer<typeof expenseInput>;

export const updateShape = {
  merchant: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  category: z.string().min(1).optional(),
  date: date.optional(),
  notes: z.string().optional(),
  status: z.enum(STATUSES).optional().describe("pending, approved, rejected or reimbursed"),
};
export const expenseUpdate = z.object(updateShape);
export type ExpenseUpdate = z.infer<typeof expenseUpdate>;

export const filterShape = {
  from: date.optional().describe("Start date, inclusive (YYYY-MM-DD)"),
  to: date.optional().describe("End date, inclusive (YYYY-MM-DD)"),
  category: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  search: z.string().optional().describe("Matches merchant or notes"),
};
export const filterSchema = z.object(filterShape);
export type Filters = z.infer<typeof filterSchema>;
