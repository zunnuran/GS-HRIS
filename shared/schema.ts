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
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  departmentId: integer("department_id").references(() => departments.id),
  position: text("position"),
  cnic: text("cnic"),
  
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
  
  // Working days for this specific payroll period (excluding Sundays by default)
  workingDaysInMonth: integer("working_days_in_month").notNull().default(26),
  
  // Weekly hours stored as HH:MM format (expected vs actual for 5 weeks)
  week1Expected: text("week1_expected").default("00:00"),
  week1Actual: text("week1_actual").default("00:00"),
  week2Expected: text("week2_expected").default("00:00"),
  week2Actual: text("week2_actual").default("00:00"),
  week3Expected: text("week3_expected").default("00:00"),
  week3Actual: text("week3_actual").default("00:00"),
  week4Expected: text("week4_expected").default("00:00"),
  week4Actual: text("week4_actual").default("00:00"),
  week5Expected: text("week5_expected").default("00:00"),
  week5Actual: text("week5_actual").default("00:00"),
  
  // Paid leaves count (e.g., 1, 1.5, 2) - converted to hours based on employee's required hours per day
  paidLeaves: decimal("paid_leaves", { precision: 4, scale: 2 }).default("0"),
  
  // Cap logged hours to expected hours per week
  capLoggedHours: boolean("cap_logged_hours").default(true),
  
  // Overtime settings
  enableOvertime: boolean("enable_overtime").default(false),
  overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }).default("0"),
  overtimePay: decimal("overtime_pay", { precision: 12, scale: 2 }).default("0"),
  
  // Calculated fields (stored as decimal for precision)
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
  taxDeduction: decimal("tax_deduction", { precision: 12, scale: 2 }).default("0"),
  
  // Dynamic allowances stored as JSON: [{label: string, value: number}]
  allowanceDetails: text("allowance_details").default("[]"),
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

// Type for allowance item
export interface AllowanceItem {
  label: string;
  value: number;
}

// Default allowance types
export const DEFAULT_ALLOWANCES = [
  { label: "Personal Development Fund (PDF)", value: 0 },
  { label: "Child Education", value: 0 },
  { label: "Inpatient Allowance", value: 0 },
  { label: "Gym Allowance", value: 0 },
];

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

// ==================== ASSET MANAGEMENT ====================

export const manufacturers = pgTable("manufacturers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  website: text("website"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertManufacturerSchema = createInsertSchema(manufacturers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManufacturer = z.infer<typeof insertManufacturerSchema>;
export type Manufacturer = typeof manufacturers.$inferSelect;

export const locations = pgTable("locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  address: text("address"),
  building: text("building"),
  floor: text("floor"),
  room: text("room"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

export const assetCategories = pgTable("asset_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetCategorySchema = createInsertSchema(assetCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssetCategory = z.infer<typeof insertAssetCategorySchema>;
export type AssetCategory = typeof assetCategories.$inferSelect;

export const assetSubCategories = pgTable("asset_sub_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => assetCategories.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetSubCategorySchema = createInsertSchema(assetSubCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssetSubCategory = z.infer<typeof insertAssetSubCategorySchema>;
export type AssetSubCategory = typeof assetSubCategories.$inferSelect;

export const assetCodeSequence = pgTable("asset_code_sequence", {
  id: integer("id").primaryKey().default(1),
  lastNumber: integer("last_number").notNull().default(0),
});

export const assets = pgTable("assets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => assetCategories.id),
  subCategoryId: integer("sub_category_id").references(() => assetSubCategories.id),
  manufacturerId: integer("manufacturer_id").references(() => manufacturers.id),
  locationId: integer("location_id").references(() => locations.id),
  status: text("status").notNull().default("working"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  purchaseDate: date("purchase_date"),
  manufacturer: text("manufacturer_name"),
  serialNumber: text("serial_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  code: z.string().optional(),
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

export const assetAssignments = pgTable("asset_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  assetId: integer("asset_id").references(() => assets.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  assignmentDate: date("assignment_date").notNull(),
  recoveryDate: date("recovery_date"),
  estimatedCost: decimal("estimated_cost", { precision: 12, scale: 2 }),
  assetStatus: text("asset_status").notNull().default("working"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAssetAssignmentSchema = createInsertSchema(assetAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAssetAssignment = z.infer<typeof insertAssetAssignmentSchema>;
export type AssetAssignment = typeof assetAssignments.$inferSelect;

export const assetCategoriesRelations = relations(assetCategories, ({ many }) => ({
  subCategories: many(assetSubCategories),
  assets: many(assets),
}));

export const assetSubCategoriesRelations = relations(assetSubCategories, ({ one }) => ({
  category: one(assetCategories, {
    fields: [assetSubCategories.categoryId],
    references: [assetCategories.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  category: one(assetCategories, {
    fields: [assets.categoryId],
    references: [assetCategories.id],
  }),
  subCategory: one(assetSubCategories, {
    fields: [assets.subCategoryId],
    references: [assetSubCategories.id],
  }),
  manufacturerRef: one(manufacturers, {
    fields: [assets.manufacturerId],
    references: [manufacturers.id],
  }),
  location: one(locations, {
    fields: [assets.locationId],
    references: [locations.id],
  }),
  assignments: many(assetAssignments),
}));

export const assetAssignmentsRelations = relations(assetAssignments, ({ one }) => ({
  asset: one(assets, {
    fields: [assetAssignments.assetId],
    references: [assets.id],
  }),
  employee: one(employees, {
    fields: [assetAssignments.employeeId],
    references: [employees.id],
  }),
}));

export type AssetWithRelations = Asset & {
  category?: AssetCategory | null;
  subCategory?: AssetSubCategory | null;
  manufacturerRef?: Manufacturer | null;
  location?: Location | null;
};

export type AssetAssignmentWithDetails = AssetAssignment & {
  asset?: Asset | null;
  employee?: Employee | null;
};

// Settings table (key-value store for server-side config)
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Setting = typeof settings.$inferSelect;
