import {
  users,
  departments,
  employees,
  payrollRecords,
  type User,
  type InsertUser,
  type Department,
  type InsertDepartment,
  type Employee,
  type InsertEmployee,
  type EmployeeWithDepartment,
  type PayrollRecord,
  type InsertPayrollRecord,
  type PayrollRecordWithEmployee,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validatePassword(user: User, password: string): Promise<boolean>;

  // Department operations
  getDepartments(): Promise<(Department & { employeeCount: number })[]>;
  getDepartment(id: number): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: number): Promise<boolean>;

  // Employee operations
  getEmployees(): Promise<EmployeeWithDepartment[]>;
  getEmployee(id: number): Promise<EmployeeWithDepartment | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<boolean>;

  // Payroll operations
  getPayrollRecords(): Promise<PayrollRecordWithEmployee[]>;
  getPayrollRecord(id: number): Promise<PayrollRecordWithEmployee | undefined>;
  createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord>;
  updatePayrollRecord(id: number, record: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined>;
  deletePayrollRecord(id: number): Promise<boolean>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    pendingPayroll: number;
    thisMonthPayroll: number;
    lastMonthPayroll: number;
  }>;
  getPayrollHistory(): Promise<{ month: string; amount: number }[]>;
  getRecentActivity(): Promise<{ id: number; type: string; description: string; timestamp: string }[]>;

  // Seed default data
  seedDefaultData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...userData, password: hashedPassword })
      .returning();
    return user;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  // Department operations
  async getDepartments(): Promise<(Department & { employeeCount: number })[]> {
    const result = await db
      .select({
        id: departments.id,
        name: departments.name,
        description: departments.description,
        createdAt: departments.createdAt,
        employeeCount: sql<number>`cast(count(${employees.id}) as int)`,
      })
      .from(departments)
      .leftJoin(employees, eq(employees.departmentId, departments.id))
      .groupBy(departments.id)
      .orderBy(departments.name);
    return result;
  }

  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [newDepartment] = await db.insert(departments).values(department).returning();
    return newDepartment;
  }

  async updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db
      .update(departments)
      .set(department)
      .where(eq(departments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    await db.update(employees).set({ departmentId: null }).where(eq(employees.departmentId, id));
    const result = await db.delete(departments).where(eq(departments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Employee operations
  async getEmployees(): Promise<EmployeeWithDepartment[]> {
    const result = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        departmentId: employees.departmentId,
        position: employees.position,
        grossSalary: employees.grossSalary,
        requiredHoursPerDay: employees.requiredHoursPerDay,
        workingDaysPerMonth: employees.workingDaysPerMonth,
        overtimeMultiplier: employees.overtimeMultiplier,
        hireDate: employees.hireDate,
        status: employees.status,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        department: departments,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .orderBy(desc(employees.createdAt));
    return result;
  }

  async getEmployee(id: number): Promise<EmployeeWithDepartment | undefined> {
    const [result] = await db
      .select({
        id: employees.id,
        employeeId: employees.employeeId,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        departmentId: employees.departmentId,
        position: employees.position,
        grossSalary: employees.grossSalary,
        requiredHoursPerDay: employees.requiredHoursPerDay,
        workingDaysPerMonth: employees.workingDaysPerMonth,
        overtimeMultiplier: employees.overtimeMultiplier,
        hireDate: employees.hireDate,
        status: employees.status,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        department: departments,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(employees.id, id));
    return result || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db
      .update(employees)
      .set({ ...employee, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();
    return updated;
  }

  async deleteEmployee(id: number): Promise<boolean> {
    await db.delete(payrollRecords).where(eq(payrollRecords.employeeId, id));
    const result = await db.delete(employees).where(eq(employees.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Payroll operations
  async getPayrollRecords(): Promise<PayrollRecordWithEmployee[]> {
    const records = await db
      .select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.createdAt));

    const recordsWithEmployees: PayrollRecordWithEmployee[] = [];
    for (const record of records) {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, record.employeeId));
      if (employee) {
        recordsWithEmployees.push({ ...record, employee });
      }
    }
    return recordsWithEmployees;
  }

  async getPayrollRecord(id: number): Promise<PayrollRecordWithEmployee | undefined> {
    const [record] = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.id, id));

    if (!record) return undefined;

    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, record.employeeId));

    if (!employee) return undefined;

    return { ...record, employee };
  }

  async createPayrollRecord(record: InsertPayrollRecord): Promise<PayrollRecord> {
    const [newRecord] = await db.insert(payrollRecords).values(record).returning();
    return newRecord;
  }

  async updatePayrollRecord(id: number, record: Partial<InsertPayrollRecord>): Promise<PayrollRecord | undefined> {
    const [updated] = await db
      .update(payrollRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(payrollRecords.id, id))
      .returning();
    return updated;
  }

  async deletePayrollRecord(id: number): Promise<boolean> {
    const result = await db.delete(payrollRecords).where(eq(payrollRecords.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Dashboard stats
  async getDashboardStats() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [totalEmployeesResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(employees);

    const [activeEmployeesResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(employees)
      .where(eq(employees.status, "active"));

    const [departmentsResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(departments);

    const [pendingPayrollResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(payrollRecords)
      .where(eq(payrollRecords.status, "pending"));

    const [thisMonthPayrollResult] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${payrollRecords.netSalary} as numeric)), 0)` })
      .from(payrollRecords)
      .where(
        and(
          eq(payrollRecords.month, currentMonth),
          eq(payrollRecords.year, currentYear)
        )
      );

    const [lastMonthPayrollResult] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${payrollRecords.netSalary} as numeric)), 0)` })
      .from(payrollRecords)
      .where(
        and(
          eq(payrollRecords.month, lastMonth),
          eq(payrollRecords.year, lastMonthYear)
        )
      );

    return {
      totalEmployees: totalEmployeesResult?.count ?? 0,
      activeEmployees: activeEmployeesResult?.count ?? 0,
      totalDepartments: departmentsResult?.count ?? 0,
      pendingPayroll: pendingPayrollResult?.count ?? 0,
      thisMonthPayroll: Number(thisMonthPayrollResult?.total ?? 0),
      lastMonthPayroll: Number(lastMonthPayrollResult?.total ?? 0),
    };
  }

  // Payroll history for dashboard
  async getPayrollHistory(): Promise<{ month: string; amount: number }[]> {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const results: { month: string; amount: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      let month = currentMonth - i;
      let year = currentYear;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      
      const [result] = await db
        .select({ total: sql<number>`coalesce(sum(cast(${payrollRecords.netSalary} as numeric)), 0)` })
        .from(payrollRecords)
        .where(and(eq(payrollRecords.month, month), eq(payrollRecords.year, year)));
      
      results.push({
        month: months[month - 1],
        amount: Number(result?.total ?? 0),
      });
    }
    
    return results;
  }

  // Recent activity for dashboard
  async getRecentActivity(): Promise<{ id: number; type: string; description: string; timestamp: string }[]> {
    const recentPayroll = await db
      .select()
      .from(payrollRecords)
      .orderBy(desc(payrollRecords.createdAt))
      .limit(5);

    const activity: { id: number; type: string; description: string; timestamp: string }[] = [];
    
    for (const record of recentPayroll) {
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, record.employeeId));
      
      if (employee) {
        activity.push({
          id: record.id,
          type: "payroll",
          description: `Payroll record created for ${employee.firstName} ${employee.lastName}`,
          timestamp: record.createdAt?.toISOString() ?? new Date().toISOString(),
        });
      }
    }
    
    return activity;
  }

  // Seed default data
  async seedDefaultData(): Promise<void> {
    const existingAdmin = await this.getUserByUsername("admin");
    if (!existingAdmin) {
      await this.createUser({
        username: "admin",
        password: "admin123",
        fullName: "System Administrator",
        email: "admin@gamehr.com",
        role: "admin",
        isActive: true,
      });
      console.log("Default admin user created: admin / admin123");
    }

    const existingDepts = await this.getDepartments();
    if (existingDepts.length === 0) {
      await this.createDepartment({ name: "Game Development", description: "Core game development team" });
      await this.createDepartment({ name: "Art & Design", description: "Visual design and assets" });
      await this.createDepartment({ name: "QA & Testing", description: "Quality assurance team" });
      await this.createDepartment({ name: "HR & Admin", description: "Human resources and administration" });
      console.log("Default departments created");
    }
  }
}

export const storage = new DatabaseStorage();
