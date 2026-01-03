import {
  users,
  manufacturers,
  locations,
  assetCategories,
  assetSubCategories,
  assets,
  assignees,
  assignments,
  assetCodeSequence,
  type User,
  type InsertUser,
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
  type Assignee,
  type InsertAssignee,
  type Assignment,
  type InsertAssignment,
  type AssignmentWithDetails,
  type AssetWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, isNull, isNotNull, inArray, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  validatePassword(user: User, password: string): Promise<boolean>;

  // Manufacturer operations
  getManufacturers(): Promise<(Manufacturer & { assetCount: number })[]>;
  getManufacturer(id: number): Promise<Manufacturer | undefined>;
  createManufacturer(manufacturer: InsertManufacturer): Promise<Manufacturer>;
  updateManufacturer(id: number, manufacturer: Partial<InsertManufacturer>): Promise<Manufacturer | undefined>;
  deleteManufacturer(id: number): Promise<boolean>;

  // Location operations
  getLocations(): Promise<(Location & { assetCount: number })[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Category operations
  getCategories(): Promise<(AssetCategory & { assetCount: number })[]>;
  getCategory(id: number): Promise<AssetCategory | undefined>;
  createCategory(category: InsertAssetCategory): Promise<AssetCategory>;
  updateCategory(id: number, category: Partial<InsertAssetCategory>): Promise<AssetCategory | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // SubCategory operations
  getSubCategories(): Promise<(AssetSubCategory & { category?: AssetCategory | null; assetCount: number })[]>;
  getSubCategoriesByCategory(categoryId: number): Promise<AssetSubCategory[]>;
  getSubCategory(id: number): Promise<AssetSubCategory | undefined>;
  createSubCategory(subCategory: InsertAssetSubCategory): Promise<AssetSubCategory>;
  updateSubCategory(id: number, subCategory: Partial<InsertAssetSubCategory>): Promise<AssetSubCategory | undefined>;
  deleteSubCategory(id: number): Promise<boolean>;

  // Asset operations
  getAssets(): Promise<AssetWithRelations[]>;
  getAssetsWithAssignmentStatus(): Promise<(AssetWithRelations & { isAssigned: boolean })[]>;
  getRecentAssets(limit: number): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  getAssetByCode(code: string): Promise<Asset | undefined>;
  generateAssetCode(): Promise<string>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<boolean>;

  // Assignee operations
  getAssignees(): Promise<(Assignee & { assignmentCount: number })[]>;
  getAssignee(id: number): Promise<Assignee | undefined>;
  getAssigneeByEmployeeId(employeeId: string): Promise<Assignee | undefined>;
  createAssignee(assignee: InsertAssignee): Promise<Assignee>;
  updateAssignee(id: number, assignee: Partial<InsertAssignee>): Promise<Assignee | undefined>;
  deleteAssignee(id: number): Promise<boolean>;

  // Assignment operations
  getAssignments(): Promise<AssignmentWithDetails[]>;
  getRecentAssignments(limit: number): Promise<AssignmentWithDetails[]>;
  getAssignment(id: number): Promise<AssignmentWithDetails | undefined>;
  getAssignmentsByAssetId(assetId: number): Promise<AssignmentWithDetails[]>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalAssets: number;
    totalCategories: number;
    totalAssignees: number;
    activeAssignments: number;
    statusCounts: {
      working: number;
      malfunctioning: number;
      damaged: number;
    };
  }>;

  // Seed default data
  seedDefaultData(): Promise<void>;

  // Backup/Restore
  backupDatabase(): Promise<string>;
  restoreDatabase(sql: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.username);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({ ...userData, password: hashedPassword })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const updateData = { ...userData, updatedAt: new Date() };
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

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
    const [manufacturer] = await db.select().from(manufacturers).where(eq(manufacturers.id, id));
    return manufacturer;
  }

  async createManufacturer(manufacturer: InsertManufacturer): Promise<Manufacturer> {
    const [newManufacturer] = await db.insert(manufacturers).values(manufacturer).returning();
    return newManufacturer;
  }

  async updateManufacturer(id: number, manufacturer: Partial<InsertManufacturer>): Promise<Manufacturer | undefined> {
    const [updated] = await db
      .update(manufacturers)
      .set({ ...manufacturer, updatedAt: new Date() })
      .where(eq(manufacturers.id, id))
      .returning();
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
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const [updated] = await db
      .update(locations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return updated;
  }

  async deleteLocation(id: number): Promise<boolean> {
    await db.update(assets).set({ locationId: null }).where(eq(assets.locationId, id));
    const result = await db.delete(locations).where(eq(locations.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Category operations
  async getCategories(): Promise<(AssetCategory & { assetCount: number })[]> {
    const categoriesWithCount = await db
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

    return categoriesWithCount;
  }

  async getCategory(id: number): Promise<AssetCategory | undefined> {
    const [category] = await db.select().from(assetCategories).where(eq(assetCategories.id, id));
    return category;
  }

  async createCategory(category: InsertAssetCategory): Promise<AssetCategory> {
    const [newCategory] = await db.insert(assetCategories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertAssetCategory>): Promise<AssetCategory | undefined> {
    const [updated] = await db
      .update(assetCategories)
      .set({ ...category, updatedAt: new Date() })
      .where(eq(assetCategories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(assetSubCategories).where(eq(assetSubCategories.categoryId, id));
    await db.update(assets).set({ categoryId: null, subCategoryId: null }).where(eq(assets.categoryId, id));
    const result = await db.delete(assetCategories).where(eq(assetCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // SubCategory operations
  async getSubCategories(): Promise<(AssetSubCategory & { category?: AssetCategory | null; assetCount: number })[]> {
    const result = await db
      .select({
        id: assetSubCategories.id,
        name: assetSubCategories.name,
        description: assetSubCategories.description,
        categoryId: assetSubCategories.categoryId,
        createdAt: assetSubCategories.createdAt,
        updatedAt: assetSubCategories.updatedAt,
        category: assetCategories,
        assetCount: sql<number>`cast(count(${assets.id}) as int)`,
      })
      .from(assetSubCategories)
      .leftJoin(assetCategories, eq(assetSubCategories.categoryId, assetCategories.id))
      .leftJoin(assets, eq(assets.subCategoryId, assetSubCategories.id))
      .groupBy(assetSubCategories.id, assetCategories.id)
      .orderBy(assetSubCategories.name);

    return result;
  }

  async getSubCategoriesByCategory(categoryId: number): Promise<AssetSubCategory[]> {
    return await db
      .select()
      .from(assetSubCategories)
      .where(eq(assetSubCategories.categoryId, categoryId))
      .orderBy(assetSubCategories.name);
  }

  async getSubCategory(id: number): Promise<AssetSubCategory | undefined> {
    const [subCategory] = await db.select().from(assetSubCategories).where(eq(assetSubCategories.id, id));
    return subCategory;
  }

  async createSubCategory(subCategory: InsertAssetSubCategory): Promise<AssetSubCategory> {
    const [newSubCategory] = await db.insert(assetSubCategories).values(subCategory).returning();
    return newSubCategory;
  }

  async updateSubCategory(id: number, subCategory: Partial<InsertAssetSubCategory>): Promise<AssetSubCategory | undefined> {
    const [updated] = await db
      .update(assetSubCategories)
      .set({ ...subCategory, updatedAt: new Date() })
      .where(eq(assetSubCategories.id, id))
      .returning();
    return updated;
  }

  async deleteSubCategory(id: number): Promise<boolean> {
    await db.update(assets).set({ subCategoryId: null }).where(eq(assets.subCategoryId, id));
    const result = await db.delete(assetSubCategories).where(eq(assetSubCategories.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Asset operations
  async getAssets(): Promise<AssetWithRelations[]> {
    const result = await db
      .select({
        asset: assets,
        category: assetCategories,
        subCategory: assetSubCategories,
        manufacturer: manufacturers,
        location: locations,
      })
      .from(assets)
      .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
      .leftJoin(assetSubCategories, eq(assets.subCategoryId, assetSubCategories.id))
      .leftJoin(manufacturers, eq(assets.manufacturerId, manufacturers.id))
      .leftJoin(locations, eq(assets.locationId, locations.id))
      .orderBy(desc(assets.createdAt));

    return result.map((row) => ({
      ...row.asset,
      category: row.category,
      subCategory: row.subCategory,
      manufacturer: row.manufacturer,
      location: row.location,
    }));
  }

  async getAssetsWithAssignmentStatus(): Promise<(AssetWithRelations & { isAssigned: boolean })[]> {
    const result = await db
      .select({
        asset: assets,
        category: assetCategories,
        subCategory: assetSubCategories,
        manufacturer: manufacturers,
        location: locations,
        assignment: assignments,
        assignee: assignees,
      })
      .from(assets)
      .leftJoin(assetCategories, eq(assets.categoryId, assetCategories.id))
      .leftJoin(assetSubCategories, eq(assets.subCategoryId, assetSubCategories.id))
      .leftJoin(manufacturers, eq(assets.manufacturerId, manufacturers.id))
      .leftJoin(locations, eq(assets.locationId, locations.id))
      .leftJoin(assignments, and(eq(assets.id, assignments.assetId), eq(assignments.isActive, true)))
      .leftJoin(assignees, eq(assignments.assigneeId, assignees.id))
      .orderBy(desc(assets.createdAt));

    return result.map((row) => ({
      ...row.asset,
      category: row.category,
      subCategory: row.subCategory,
      manufacturer: row.manufacturer,
      location: row.location,
      currentAssignee: row.assignee,
      isAssigned: row.assignment !== null,
    }));
  }

  async getRecentAssets(limit: number): Promise<Asset[]> {
    return await db.select().from(assets).orderBy(desc(assets.createdAt)).limit(limit);
  }

  async getAsset(id: number): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset;
  }

  async getAssetByCode(code: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.code, code));
    return asset;
  }

  async generateAssetCode(): Promise<string> {
    const result = await db
      .insert(assetCodeSequence)
      .values({ id: 1, lastNumber: 1 })
      .onConflictDoUpdate({
        target: assetCodeSequence.id,
        set: { lastNumber: sql`${assetCodeSequence.lastNumber} + 1` },
      })
      .returning();

    const [sequence] = await db.select().from(assetCodeSequence).where(eq(assetCodeSequence.id, 1));
    const paddedNumber = String(sequence.lastNumber).padStart(6, '0');
    return `GSX-${paddedNumber}`;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: number, asset: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [updated] = await db
      .update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updated;
  }

  async deleteAsset(id: number): Promise<boolean> {
    await db.delete(assignments).where(eq(assignments.assetId, id));
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Assignee operations
  async getAssignees(): Promise<(Assignee & { assignmentCount: number })[]> {
    const assigneesWithCount = await db
      .select({
        id: assignees.id,
        employeeId: assignees.employeeId,
        firstName: assignees.firstName,
        lastName: assignees.lastName,
        email: assignees.email,
        phone: assignees.phone,
        department: assignees.department,
        position: assignees.position,
        isActive: assignees.isActive,
        createdAt: assignees.createdAt,
        updatedAt: assignees.updatedAt,
        assignmentCount: sql<number>`cast(count(case when ${assignments.isActive} = true then 1 end) as int)`,
      })
      .from(assignees)
      .leftJoin(assignments, eq(assignments.assigneeId, assignees.id))
      .groupBy(assignees.id)
      .orderBy(assignees.firstName, assignees.lastName);

    return assigneesWithCount;
  }

  async getAssignee(id: number): Promise<Assignee | undefined> {
    const [assignee] = await db.select().from(assignees).where(eq(assignees.id, id));
    return assignee;
  }

  async getAssigneeByEmployeeId(employeeId: string): Promise<Assignee | undefined> {
    const [assignee] = await db.select().from(assignees).where(eq(assignees.employeeId, employeeId));
    return assignee;
  }

  async createAssignee(assignee: InsertAssignee): Promise<Assignee> {
    const [newAssignee] = await db.insert(assignees).values(assignee).returning();
    return newAssignee;
  }

  async updateAssignee(id: number, assignee: Partial<InsertAssignee>): Promise<Assignee | undefined> {
    const [updated] = await db
      .update(assignees)
      .set({ ...assignee, updatedAt: new Date() })
      .where(eq(assignees.id, id))
      .returning();
    return updated;
  }

  async deleteAssignee(id: number): Promise<boolean> {
    await db.delete(assignments).where(eq(assignments.assigneeId, id));
    const result = await db.delete(assignees).where(eq(assignees.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Assignment operations
  async getAssignments(): Promise<AssignmentWithDetails[]> {
    const result = await db
      .select({
        assignment: assignments,
        asset: assets,
        assignee: assignees,
      })
      .from(assignments)
      .leftJoin(assets, eq(assignments.assetId, assets.id))
      .leftJoin(assignees, eq(assignments.assigneeId, assignees.id))
      .orderBy(desc(assignments.createdAt));

    return result.map((row) => ({
      ...row.assignment,
      asset: row.asset,
      assignee: row.assignee,
    }));
  }

  async getRecentAssignments(limit: number): Promise<AssignmentWithDetails[]> {
    const result = await db
      .select({
        assignment: assignments,
        asset: assets,
        assignee: assignees,
      })
      .from(assignments)
      .leftJoin(assets, eq(assignments.assetId, assets.id))
      .leftJoin(assignees, eq(assignments.assigneeId, assignees.id))
      .where(eq(assignments.isActive, true))
      .orderBy(desc(assignments.createdAt))
      .limit(limit);

    return result.map((row) => ({
      ...row.assignment,
      asset: row.asset,
      assignee: row.assignee,
    }));
  }

  async getAssignment(id: number): Promise<AssignmentWithDetails | undefined> {
    const [result] = await db
      .select({
        assignment: assignments,
        asset: assets,
        assignee: assignees,
      })
      .from(assignments)
      .leftJoin(assets, eq(assignments.assetId, assets.id))
      .leftJoin(assignees, eq(assignments.assigneeId, assignees.id))
      .where(eq(assignments.id, id));

    if (!result) return undefined;

    return {
      ...result.assignment,
      asset: result.asset,
      assignee: result.assignee,
    };
  }

  async getAssignmentsByAssetId(assetId: number): Promise<AssignmentWithDetails[]> {
    const result = await db
      .select({
        assignment: assignments,
        asset: assets,
        assignee: assignees,
      })
      .from(assignments)
      .leftJoin(assets, eq(assignments.assetId, assets.id))
      .leftJoin(assignees, eq(assignments.assigneeId, assignees.id))
      .where(eq(assignments.assetId, assetId))
      .orderBy(desc(assignments.assignmentDate));

    return result.map((row) => ({
      ...row.assignment,
      asset: row.asset,
      assignee: row.assignee,
    }));
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [updated] = await db
      .update(assignments)
      .set({ ...assignment, updatedAt: new Date() })
      .where(eq(assignments.id, id))
      .returning();
    return updated;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await db.delete(assignments).where(eq(assignments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Dashboard stats
  async getDashboardStats() {
    const [assetStats] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        working: sql<number>`cast(count(case when ${assets.status} = 'working' then 1 end) as int)`,
        malfunctioning: sql<number>`cast(count(case when ${assets.status} = 'malfunctioning' then 1 end) as int)`,
        damaged: sql<number>`cast(count(case when ${assets.status} = 'damaged' then 1 end) as int)`,
      })
      .from(assets);

    const [categoryCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assetCategories);

    const [assigneeCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assignees)
      .where(eq(assignees.isActive, true));

    const [activeAssignmentCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(assignments)
      .where(eq(assignments.isActive, true));

    return {
      totalAssets: assetStats?.total || 0,
      totalCategories: categoryCount?.count || 0,
      totalAssignees: assigneeCount?.count || 0,
      activeAssignments: activeAssignmentCount?.count || 0,
      statusCounts: {
        working: assetStats?.working || 0,
        malfunctioning: assetStats?.malfunctioning || 0,
        damaged: assetStats?.damaged || 0,
      },
    };
  }

  // Seed default data
  async seedDefaultData(): Promise<void> {
    // Check if admin user exists
    const existingAdmin = await this.getUserByUsername('admin');
    if (!existingAdmin) {
      await this.createUser({
        username: 'admin',
        password: 'admin123',
        firstName: 'System',
        lastName: 'Administrator',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
      });
    }

    // Seed default manufacturers
    const defaultManufacturers = [
      { name: 'Dell', description: 'Dell Technologies - Computer hardware' },
      { name: 'HP', description: 'Hewlett-Packard - Computing and printing' },
      { name: 'Lenovo', description: 'Lenovo Group - PC manufacturer' },
      { name: 'Apple', description: 'Apple Inc. - Consumer electronics' },
      { name: 'Microsoft', description: 'Microsoft Corporation - Software and hardware' },
      { name: 'Samsung', description: 'Samsung Electronics - Electronics' },
      { name: 'Cisco', description: 'Cisco Systems - Networking equipment' },
      { name: 'Sony', description: 'Sony Corporation - Electronics' },
      { name: 'LG', description: 'LG Electronics - Electronics and appliances' },
      { name: 'Asus', description: 'ASUSTeK Computer - Computer hardware' },
    ];

    for (const mfr of defaultManufacturers) {
      const existing = await db.select().from(manufacturers).where(eq(manufacturers.name, mfr.name));
      if (existing.length === 0) {
        await db.insert(manufacturers).values(mfr);
      }
    }

    // Seed default locations
    const defaultLocations = [
      { name: 'Head Office', description: 'Main headquarters', building: 'Building A', floor: '1' },
      { name: 'IT Department', description: 'IT team workspace', building: 'Building A', floor: '2' },
      { name: 'Server Room', description: 'Data center', building: 'Building A', floor: 'Basement' },
      { name: 'Conference Room A', description: 'Large meeting room', building: 'Building A', floor: '3' },
      { name: 'Conference Room B', description: 'Small meeting room', building: 'Building A', floor: '3' },
      { name: 'Reception', description: 'Front desk area', building: 'Building A', floor: '1' },
      { name: 'Warehouse', description: 'Storage facility', building: 'Building B', floor: '1' },
      { name: 'Branch Office', description: 'Secondary office', building: 'Building C', floor: '1' },
    ];

    for (const loc of defaultLocations) {
      const existing = await db.select().from(locations).where(eq(locations.name, loc.name));
      if (existing.length === 0) {
        await db.insert(locations).values(loc);
      }
    }

    // Initialize asset code sequence
    const existingSeq = await db.select().from(assetCodeSequence).where(eq(assetCodeSequence.id, 1));
    if (existingSeq.length === 0) {
      await db.insert(assetCodeSequence).values({ id: 1, lastNumber: 0 });
    }
  }

  // Backup/Restore
  async backupDatabase(): Promise<string> {
    // We use raw SQL to fetch data to ensure we get the database column names (snake_case)
    // instead of Drizzle's camelCase property names.
    const fetchTable = async (tableName: string) => {
      const result = await db.execute(sql.raw(`SELECT * FROM ${tableName}`));
      return result.rows;
    };

    const allUsers = await fetchTable('users');
    const allManufacturers = await fetchTable('manufacturers');
    const allLocations = await fetchTable('locations');
    const allCategories = await fetchTable('asset_categories');
    const allSubCategories = await fetchTable('asset_sub_categories');
    const allAssets = await fetchTable('assets');
    const allAssignees = await fetchTable('assignees');
    const allAssignments = await fetchTable('assignments');
    const allSequences = await fetchTable('asset_code_sequence');

    let backupSql = `-- Asset Manager Backup\n-- Generated at ${new Date().toISOString()}\n\n`;

    // Helper to escape values for SQL
    const escape = (val: any) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (val instanceof Date) return `'${val.toISOString()}'`;
      // Escape single quotes
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Helper to generate inserts
    const generateInserts = (tableName: string, rows: any[]) => {
      if (rows.length === 0) return '';
      let sql = `-- Table: ${tableName}\n`;
      sql += `DELETE FROM ${tableName};\n`;

      const tablesWithIdentity = new Set([
        'users',
        'manufacturers',
        'locations',
        'asset_categories',
        'asset_sub_categories',
        'assets',
        'assignees',
        'assignments',
      ]);

      const overrideClause = tablesWithIdentity.has(tableName) ? ' OVERRIDING SYSTEM VALUE' : '';

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(escape);
        // Quote column names
        const quotedColumns = columns.map(c => `"${c}"`);
        sql += `INSERT INTO ${tableName} (${quotedColumns.join(', ')}) ${overrideClause} VALUES (${values.join(', ')});\n`;
      }
      sql += '\n';
      return sql;
    };

    // Order matters for Foreign Key constraints
    // We will disable triggers/constraints during restore ideally, but if not, we must delete children first (which is handled by the DELETE statements in the script if executed in reverse order of dependency, but we want the script to mostly insert?)
    // Actually, if the script has DELETEs at the top, we need to DELETE dependent tables first.

    // So let's produce a Clear All section first
    backupSql += `
DO $$ 
BEGIN 
    -- Clear existing data
    DELETE FROM assignments;
    DELETE FROM assets;
    DELETE FROM asset_sub_categories;
    DELETE FROM asset_categories;
    DELETE FROM locations;
    DELETE FROM manufacturers;
    DELETE FROM assignees;
    DELETE FROM users;
    DELETE FROM asset_code_sequence;
END $$;\n\n`;

    // Now Inserts in dependency order
    backupSql += generateInserts('users', allUsers);
    backupSql += generateInserts('manufacturers', allManufacturers);
    backupSql += generateInserts('locations', allLocations);
    backupSql += generateInserts('asset_categories', allCategories);
    backupSql += generateInserts('asset_sub_categories', allSubCategories);
    backupSql += generateInserts('assignees', allAssignees);
    backupSql += generateInserts('asset_code_sequence', allSequences);
    backupSql += generateInserts('assets', allAssets);
    backupSql += generateInserts('assignments', allAssignments);

    return backupSql;
  }

  async restoreDatabase(sqlContent: string): Promise<boolean> {
    try {
      // Execute the entire SQL script
      // Drizzle doesn't have a direct "execute massive string" easily exposed on 'db' without 'sql', 
      // but 'sql.raw' or using the underlying pool is better.

      // We are using 'pg' pool directly in db.ts but purely via drizzle here.
      // Drizzle's db.execute(sql.raw(string)) should work.

      await db.execute(sql.raw(sqlContent));
      return true;
    } catch (error) {
      console.error("Restore failed:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();

