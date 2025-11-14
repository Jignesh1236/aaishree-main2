import { z } from "zod";

export const serviceItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Service name is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

export const expenseItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Expense name is required"),
  amount: z.number().min(0, "Amount must be positive"),
});

export const insertReportSchema = z.object({
  date: z.string(),
  services: z.array(serviceItemSchema).default([]),
  expenses: z.array(expenseItemSchema).default([]),
  totalServices: z.string(),
  totalExpenses: z.string(),
  netProfit: z.string(),
  onlinePayment: z.string().optional().default("0"),
  createdBy: z.string().optional(),
  createdByUsername: z.string().optional(),
});

export const reportSchema = insertReportSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});

export const userRoleSchema = z.enum(["admin", "manager", "employee"]);

export const insertUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  email: z.string().email("Valid email is required").optional(),
  role: userRoleSchema.default("employee"),
});

export const userSchema = insertUserSchema.extend({
  id: z.string(),
  createdAt: z.date(),
  isActive: z.boolean().default(true),
  lastLogin: z.date().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email("Valid email is required").optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type ServiceItem = z.infer<typeof serviceItemSchema>;
export type ExpenseItem = z.infer<typeof expenseItemSchema>;
export type Report = z.infer<typeof reportSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export interface DailyReport {
  date: string;
  services: ServiceItem[];
  expenses: ExpenseItem[];
}

export interface ReportSummary {
  totalServices: number;
  totalExpenses: number;
  netProfit: number;
  onlinePayment: number;
  cashPayment: number;
}

export const activityLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  action: z.enum([
    "login", 
    "logout", 
    "report_created", 
    "report_updated", 
    "report_deleted", 
    "report_viewed",
    "report_exported",
    "report_shared",
    "user_created",
    "user_updated",
    "user_deleted"
  ]),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;