import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Departments table
export const departments = pgTable("departments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Employees table with all payroll-related attributes
export const employees = pgTable("employees", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: text("employee_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  departmentId: integer("department_id").references(() => departments.id),
  position: text("position"),
  
  // Payroll attributes
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  requiredHoursPerDay: decimal("required_hours_per_day", { precision: 4, scale: 2 }).notNull().default("8"),
  workingDaysPerMonth: integer("working_days_per_month").notNull().default(26),
  overtimeMultiplier: decimal("overtime_multiplier", { precision: 4, scale: 2 }).notNull().default("1.0"),
  
  // Employment details
  hireDate: date("hire_date"),
  status: text("status").notNull().default("active"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  payrollRecords: many(payrollRecords),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

// Payroll records table
export const payrollRecords = pgTable("payroll_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").notNull().references(() => employees.id),
  
  // Period
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  
  // Weekly hours (expected vs actual for 5 weeks)
  week1Expected: decimal("week1_expected", { precision: 6, scale: 2 }).default("0"),
  week1Actual: decimal("week1_actual", { precision: 6, scale: 2 }).default("0"),
  week2Expected: decimal("week2_expected", { precision: 6, scale: 2 }).default("0"),
  week2Actual: decimal("week2_actual", { precision: 6, scale: 2 }).default("0"),
  week3Expected: decimal("week3_expected", { precision: 6, scale: 2 }).default("0"),
  week3Actual: decimal("week3_actual", { precision: 6, scale: 2 }).default("0"),
  week4Expected: decimal("week4_expected", { precision: 6, scale: 2 }).default("0"),
  week4Actual: decimal("week4_actual", { precision: 6, scale: 2 }).default("0"),
  week5Expected: decimal("week5_expected", { precision: 6, scale: 2 }).default("0"),
  week5Actual: decimal("week5_actual", { precision: 6, scale: 2 }).default("0"),
  
  // Calculated fields
  totalHoursWorked: decimal("total_hours_worked", { precision: 8, scale: 2 }).default("0"),
  requiredMonthlyHours: decimal("required_monthly_hours", { precision: 8, scale: 2 }).default("0"),
  hoursDifference: decimal("hours_difference", { precision: 8, scale: 2 }).default("0"),
  
  // Leave encashment
  leaveEncashmentDays: integer("leave_encashment_days").default(0),
  adjustedHoursDifference: decimal("adjusted_hours_difference", { precision: 8, scale: 2 }).default("0"),
  
  // Rates
  perHourRate: decimal("per_hour_rate", { precision: 10, scale: 2 }).default("0"),
  perDayRate: decimal("per_day_rate", { precision: 10, scale: 2 }).default("0"),
  
  // Deductions and adjustments
  hoursDeduction: decimal("hours_deduction", { precision: 12, scale: 2 }).default("0"),
  advanceDeduction: decimal("advance_deduction", { precision: 12, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 12, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 12, scale: 2 }).default("0"),
  
  // Final amounts
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).default("0"),
  
  // Metadata
  remarks: text("remarks"),
  status: text("status").notNull().default("draft"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollRecordsRelations = relations(payrollRecords, ({ one }) => ({
  employee: one(employees, {
    fields: [payrollRecords.employeeId],
    references: [employees.id],
  }),
}));

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;
export type PayrollRecord = typeof payrollRecords.$inferSelect;

// Type for employee with department
export type EmployeeWithDepartment = Employee & {
  department: Department | null;
};

// Type for payroll record with employee
export type PayrollRecordWithEmployee = PayrollRecord & {
  employee: Employee;
};
