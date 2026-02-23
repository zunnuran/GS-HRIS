import {
  users,
  departments,
  employees,
  payrollRecords,
  manufacturers,
  locations,
  assetCategories,
  assetSubCategories,
  assets,
  assetAssignments,
  assetCodeSequence,
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
  type Manufacturer,
  type InsertManufacturer,
  type Location,
  type InsertLocation,
  type AssetCategory,
  type InsertAssetCategory,
  type AssetSubCategory,
  type InsertAssetSubCategory,
  type Asset,
  type InsertAsset,
  type AssetAssignment,
  type InsertAssetAssignment,
  type AssetWithRelations,
  type AssetAssignmentWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, isNotNull } from "drizzle-orm";
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

  // Manufacturer operations
  getManufacturers(): Promise<(Manufacturer & { assetCount: number })[]>;
  getManufacturer(id: number): Promise<Manufacturer | undefined>;
  createManufacturer(m: InsertManufacturer): Promise<Manufacturer>;
  updateManufacturer(id: number, m: Partial<InsertManufacturer>): Promise<Manufacturer | undefined>;
  deleteManufacturer(id: number): Promise<boolean>;

  // Location operations
  getLocations(): Promise<(Location & { assetCount: number })[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(l: InsertLocation): Promise<Location>;
  updateLocation(id: number, l: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Asset Category operations
  getAssetCategories(): Promise<(AssetCategory & { assetCount: number })[]>;
  getAssetCategory(id: number): Promise<AssetCategory | undefined>;
  createAssetCategory(c: InsertAssetCategory): Promise<AssetCategory>;
  updateAssetCategory(id: number, c: Partial<InsertAssetCategory>): Promise<AssetCategory | undefined>;
  deleteAssetCategory(id: number): Promise<boolean>;

  // Asset SubCategory operations
  getAssetSubCategories(): Promise<(AssetSubCategory & { category?: AssetCategory | null; assetCount: number })[]>;
  getAssetSubCategoriesByCategory(categoryId: number): Promise<AssetSubCategory[]>;
  getAssetSubCategory(id: number): Promise<AssetSubCategory | undefined>;
  createAssetSubCategory(sc: InsertAssetSubCategory): Promise<AssetSubCategory>;
  updateAssetSubCategory(id: number, sc: Partial<InsertAssetSubCategory>): Promise<AssetSubCategory | undefined>;
  deleteAssetSubCategory(id: number): Promise<boolean>;

  // Asset operations
  getAssets(): Promise<AssetWithRelations[]>;
  getRecentAssets(limit: number): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  generateAssetCode(): Promise<string>;
  createAsset(a: InsertAsset): Promise<Asset>;
  updateAsset(id: number, a: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;

  // Asset Assignment operations
  getAssetAssignments(): Promise<AssetAssignmentWithDetails[]>;
  getRecentAssetAssignments(limit: number): Promise<AssetAssignmentWithDetails[]>;
  getAssetAssignment(id: number): Promise<AssetAssignment | undefined>;
  getAssetAssignmentsByAsset(assetId: number): Promise<AssetAssignmentWithDetails[]>;
  createAssetAssignment(a: InsertAssetAssignment): Promise<AssetAssignment>;
  updateAssetAssignment(id: number, a: Partial<InsertAssetAssignment>): Promise<AssetAssignment | undefined>;
  deleteAssetAssignment(id: number): Promise<boolean>;

  // Asset Dashboard stats
  getAssetDashboardStats(): Promise<{
    totalAssets: number;
    totalCategories: number;
    totalAssignees: number;
    activeAssignments: number;
    statusCounts: { working: number; malfunctioning: number; damaged: number };
  }>;
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

  // ==================== ASSET MANAGEMENT ====================

  // Manufacturer operations
  async getManufacturers(): Promise<(Manufacturer & { assetCount: number })[]> {
    const result = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        description: manufacturers.description,
        website: manufacturers.website,
        contactEmail: manufacturers.contactEmail,
        contactPhone: manufacturers.contactPhone,
        createdAt: manufacturers.createdAt,
        updatedAt: manufacturers.updatedAt,
        assetCount: sql<number>`cast(count(${assets.id}) as int)`,
      })
      .from(manufacturers)
      .leftJoin(assets, eq(assets.manufacturerId, manufacturers.id))
      .groupBy(manufacturers.id)
      .orderBy(manufacturers.name);
    return result;
  }

  async getManufacturer(id: number): Promise<Manufacturer | undefined> {
    const [m] = await db.select().from(manufacturers).where(eq(manufacturers.id, id));
    return m || undefined;
  }

  async createManufacturer(m: InsertManufacturer): Promise<Manufacturer> {
    const [created] = await db.insert(manufacturers).values(m).returning();
    return created;
  }

  async updateManufacturer(id: number, m: Partial<InsertManufacturer>): Promise<Manufacturer | undefined> {
    const [updated] = await db.update(manufacturers).set({ ...m, updatedAt: new Date() }).where(eq(manufacturers.id, id)).returning();
    return updated;
  }

  async deleteManufacturer(id: number): Promise<boolean> {
    await db.update(assets).set({ manufacturerId: null }).where(eq(assets.manufacturerId, id));
    const result = await db.delete(manufacturers).where(eq(manufacturers.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Location operations
  async getLocations(): Promise<(Location & { assetCount: number })[]> {
    const result = await db
      .select({
        id: locations.id,
        name: locations.name,
        description: locations.description,
        address: locations.address,
        building: locations.building,
        floor: locations.floor,
        room: locations.room,
        createdAt: locations.createdAt,
        updatedAt: locations.updatedAt,
        assetCount: sql<number>`cast(count(${assets.id}) as int)`,
      })
      .from(locations)
      .leftJoin(assets, eq(assets.locationId, locations.id))
      .groupBy(locations.id)
      .orderBy(locations.name);
    return result;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [l] = await db.select().from(locations).where(eq(locations.id, id));
    return l || undefined;
  }

  async createLocation(l: InsertLocation): Promise<Location> {
    const [created] = await db.insert(locations).values(l).returning();
    return created;
  }

  async updateLocation(id: number, l: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updated] = await db.update(locations).set({ ...l, updatedAt: new Date() }).where(eq(locations.id, id)).returning();
    return updated;
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.update(assets).set({ locationId: null }).where(eq(assets.locationId, id));
    const result = await db.delete(locations).where(eq(locations.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Asset Category operations
  async getAssetCategories(): Promise<(AssetCategory & { assetCount: number })[]> {
    const result = await db
      .select({
        id: assetCategories.id,
        name: assetCategories.name,
        description: assetCategories.description,
        createdAt: assetCategories.createdAt,
        updatedAt: assetCategories.updatedAt,
        assetCount: sql<number>`cast(count(${assets.id}) as int)`,
      })
      .from(assetCategories)
      .leftJoin(assets, eq(assets.categoryId, assetCategories.id))
      .groupBy(assetCategories.id)
      .orderBy(assetCategories.name);
    return result;
  }

  async getAssetCategory(id: number): Promise<AssetCategory | undefined> {
    const [c] = await db.select().from(assetCategories).where(eq(assetCategories.id, id));
    return c || undefined;
  }

  async createAssetCategory(c: InsertAssetCategory): Promise<AssetCategory> {
    const [created] = await db.insert(assetCategories).values(c).returning();
    return created;
  }

  async updateAssetCategory(id: number, c: Partial<InsertAssetCategory>): Promise<AssetCategory | undefined> {
    const [updated] = await db.update(assetCategories).set({ ...c, updatedAt: new Date() }).where(eq(assetCategories.id, id)).returning();
    return updated;
  }

  async deleteAssetCategory(id: number): Promise<boolean> {
    await db.delete(assetSubCategories).where(eq(assetSubCategories.categoryId, id));
    await db.update(assets).set({ categoryId: null }).where(eq(assets.categoryId, id));
    const result = await db.delete(assetCategories).where(eq(assetCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Asset SubCategory operations
  async getAssetSubCategories(): Promise<(AssetSubCategory & { category?: AssetCategory | null; assetCount: number })[]> {
    const subs = await db.select().from(assetSubCategories).orderBy(assetSubCategories.name);
    const result: (AssetSubCategory & { category?: AssetCategory | null; assetCount: number })[] = [];
    for (const sub of subs) {
      const [cat] = await db.select().from(assetCategories).where(eq(assetCategories.id, sub.categoryId));
      const [countResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assets).where(eq(assets.subCategoryId, sub.id));
      result.push({ ...sub, category: cat || null, assetCount: countResult?.count ?? 0 });
    }
    return result;
  }

  async getAssetSubCategoriesByCategory(categoryId: number): Promise<AssetSubCategory[]> {
    return db.select().from(assetSubCategories).where(eq(assetSubCategories.categoryId, categoryId)).orderBy(assetSubCategories.name);
  }

  async getAssetSubCategory(id: number): Promise<AssetSubCategory | undefined> {
    const [sc] = await db.select().from(assetSubCategories).where(eq(assetSubCategories.id, id));
    return sc || undefined;
  }

  async createAssetSubCategory(sc: InsertAssetSubCategory): Promise<AssetSubCategory> {
    const [created] = await db.insert(assetSubCategories).values(sc).returning();
    return created;
  }

  async updateAssetSubCategory(id: number, sc: Partial<InsertAssetSubCategory>): Promise<AssetSubCategory | undefined> {
    const [updated] = await db.update(assetSubCategories).set({ ...sc, updatedAt: new Date() }).where(eq(assetSubCategories.id, id)).returning();
    return updated;
  }

  async deleteAssetSubCategory(id: number): Promise<boolean> {
    await db.update(assets).set({ subCategoryId: null }).where(eq(assets.subCategoryId, id));
    const result = await db.delete(assetSubCategories).where(eq(assetSubCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Asset operations
  async getAssets(): Promise<AssetWithRelations[]> {
    const allAssets = await db.select().from(assets).orderBy(desc(assets.createdAt));
    const result: AssetWithRelations[] = [];
    for (const asset of allAssets) {
      const [cat] = asset.categoryId ? await db.select().from(assetCategories).where(eq(assetCategories.id, asset.categoryId)) : [null];
      const [sub] = asset.subCategoryId ? await db.select().from(assetSubCategories).where(eq(assetSubCategories.id, asset.subCategoryId)) : [null];
      const [mfr] = asset.manufacturerId ? await db.select().from(manufacturers).where(eq(manufacturers.id, asset.manufacturerId)) : [null];
      const [loc] = asset.locationId ? await db.select().from(locations).where(eq(locations.id, asset.locationId)) : [null];
      result.push({ ...asset, category: cat, subCategory: sub, manufacturerRef: mfr, location: loc });
    }
    return result;
  }

  async getRecentAssets(limit: number): Promise<Asset[]> {
    return db.select().from(assets).orderBy(desc(assets.createdAt)).limit(limit);
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [a] = await db.select().from(assets).where(eq(assets.id, id));
    return a || undefined;
  }

  async generateAssetCode(): Promise<string> {
    const [seq] = await db.select().from(assetCodeSequence).where(eq(assetCodeSequence.id, 1));
    const nextNumber = (seq?.lastNumber ?? 0) + 1;
    if (seq) {
      await db.update(assetCodeSequence).set({ lastNumber: nextNumber }).where(eq(assetCodeSequence.id, 1));
    } else {
      await db.insert(assetCodeSequence).values({ id: 1, lastNumber: nextNumber });
    }
    return `AST-${String(nextNumber).padStart(4, '0')}`;
  }

  async createAsset(a: InsertAsset): Promise<Asset> {
    if (!a.code) {
      a.code = await this.generateAssetCode();
    }
    const [created] = await db.insert(assets).values(a as any).returning();
    return created;
  }

  async updateAsset(id: number, a: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [updated] = await db.update(assets).set({ ...a, updatedAt: new Date() } as any).where(eq(assets.id, id)).returning();
    return updated;
  }

  async deleteAsset(id: number): Promise<boolean> {
    await db.delete(assetAssignments).where(eq(assetAssignments.assetId, id));
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Asset Assignment operations
  async getAssetAssignments(): Promise<AssetAssignmentWithDetails[]> {
    const allAssignments = await db.select().from(assetAssignments).orderBy(desc(assetAssignments.createdAt));
    const result: AssetAssignmentWithDetails[] = [];
    for (const assignment of allAssignments) {
      const [asset] = await db.select().from(assets).where(eq(assets.id, assignment.assetId));
      const [employee] = await db.select().from(employees).where(eq(employees.id, assignment.employeeId));
      result.push({ ...assignment, asset: asset || null, employee: employee || null });
    }
    return result;
  }

  async getRecentAssetAssignments(limit: number): Promise<AssetAssignmentWithDetails[]> {
    const recentAssignments = await db.select().from(assetAssignments).orderBy(desc(assetAssignments.createdAt)).limit(limit);
    const result: AssetAssignmentWithDetails[] = [];
    for (const assignment of recentAssignments) {
      const [asset] = await db.select().from(assets).where(eq(assets.id, assignment.assetId));
      const [employee] = await db.select().from(employees).where(eq(employees.id, assignment.employeeId));
      result.push({ ...assignment, asset: asset || null, employee: employee || null });
    }
    return result;
  }

  async getAssetAssignment(id: number): Promise<AssetAssignment | undefined> {
    const [a] = await db.select().from(assetAssignments).where(eq(assetAssignments.id, id));
    return a || undefined;
  }

  async getAssetAssignmentsByAsset(assetId: number): Promise<AssetAssignmentWithDetails[]> {
    const assignmentsList = await db.select().from(assetAssignments).where(eq(assetAssignments.assetId, assetId)).orderBy(desc(assetAssignments.assignmentDate));
    const result: AssetAssignmentWithDetails[] = [];
    for (const assignment of assignmentsList) {
      const [asset] = await db.select().from(assets).where(eq(assets.id, assignment.assetId));
      const [employee] = await db.select().from(employees).where(eq(employees.id, assignment.employeeId));
      result.push({ ...assignment, asset: asset || null, employee: employee || null });
    }
    return result;
  }

  async createAssetAssignment(a: InsertAssetAssignment): Promise<AssetAssignment> {
    const [created] = await db.insert(assetAssignments).values(a).returning();
    return created;
  }

  async updateAssetAssignment(id: number, a: Partial<InsertAssetAssignment>): Promise<AssetAssignment | undefined> {
    const [updated] = await db.update(assetAssignments).set({ ...a, updatedAt: new Date() }).where(eq(assetAssignments.id, id)).returning();
    return updated;
  }

  async deleteAssetAssignment(id: number): Promise<boolean> {
    const result = await db.delete(assetAssignments).where(eq(assetAssignments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Asset Dashboard stats
  async getAssetDashboardStats() {
    const [totalAssetsResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assets);
    const [totalCategoriesResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assetCategories);
    const [totalAssigneesResult] = await db.select({ count: sql<number>`cast(count(DISTINCT ${assetAssignments.employeeId}) as int)` }).from(assetAssignments).where(isNull(assetAssignments.recoveryDate));
    const [activeAssignmentsResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assetAssignments).where(isNull(assetAssignments.recoveryDate));

    const [workingResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assets).where(eq(assets.status, "working"));
    const [malfunctioningResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assets).where(eq(assets.status, "malfunctioning"));
    const [damagedResult] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(assets).where(eq(assets.status, "damaged"));

    return {
      totalAssets: totalAssetsResult?.count ?? 0,
      totalCategories: totalCategoriesResult?.count ?? 0,
      totalAssignees: totalAssigneesResult?.count ?? 0,
      activeAssignments: activeAssignmentsResult?.count ?? 0,
      statusCounts: {
        working: workingResult?.count ?? 0,
        malfunctioning: malfunctioningResult?.count ?? 0,
        damaged: damagedResult?.count ?? 0,
      },
    };
  }
}

export const storage = new DatabaseStorage();
