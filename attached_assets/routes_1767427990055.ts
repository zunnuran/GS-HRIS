import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import {
  insertAssetCategorySchema,
  insertAssetSubCategorySchema,
  insertAssetSchema,
  insertAssigneeSchema,
  insertAssignmentSchema,
  insertManufacturerSchema,
  insertLocationSchema,
  insertUserSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);

  // Health check endpoint for Docker
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User management routes (admin only)
  app.get('/api/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/users', isAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(data);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.put('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertUserSchema.partial().parse(req.body);

      if (data.username) {
        const existing = await storage.getUserByUsername(data.username);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  app.delete('/api/users/:id', isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Prevent deleting own account
      if ((req as any).user?.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Manufacturer routes
  app.get('/api/manufacturers', isAuthenticated, async (req, res) => {
    try {
      const manufacturers = await storage.getManufacturers();
      res.json(manufacturers);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch manufacturers" });
    }
  });

  app.get('/api/manufacturers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const manufacturer = await storage.getManufacturer(id);
      if (!manufacturer) {
        return res.status(404).json({ message: "Manufacturer not found" });
      }
      res.json(manufacturer);
    } catch (error) {
      console.error("Error fetching manufacturer:", error);
      res.status(500).json({ message: "Failed to fetch manufacturer" });
    }
  });

  app.post('/api/manufacturers', isAuthenticated, async (req, res) => {
    try {
      const data = insertManufacturerSchema.parse(req.body);
      const manufacturer = await storage.createManufacturer(data);
      res.status(201).json(manufacturer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating manufacturer:", error);
        res.status(500).json({ message: "Failed to create manufacturer" });
      }
    }
  });

  app.put('/api/manufacturers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertManufacturerSchema.partial().parse(req.body);
      const manufacturer = await storage.updateManufacturer(id, data);
      if (!manufacturer) {
        return res.status(404).json({ message: "Manufacturer not found" });
      }
      res.json(manufacturer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating manufacturer:", error);
        res.status(500).json({ message: "Failed to update manufacturer" });
      }
    }
  });

  app.delete('/api/manufacturers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteManufacturer(id);
      if (!success) {
        return res.status(404).json({ message: "Manufacturer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting manufacturer:", error);
      res.status(500).json({ message: "Failed to delete manufacturer" });
    }
  });

  // Location routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getLocation(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  app.post('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const data = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(data);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating location:", error);
        res.status(500).json({ message: "Failed to create location" });
      }
    }
  });

  app.put('/api/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocation(id, data);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating location:", error);
        res.status(500).json({ message: "Failed to update location" });
      }
    }
  });

  app.delete('/api/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLocation(id);
      if (!success) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Category routes
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const data = insertAssetCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating category:", error);
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.put('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, data);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating category:", error);
        res.status(500).json({ message: "Failed to update category" });
      }
    }
  });

  app.delete('/api/categories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCategory(id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // SubCategory routes
  app.get('/api/subcategories', isAuthenticated, async (req, res) => {
    try {
      const subCategories = await storage.getSubCategories();
      res.json(subCategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.get('/api/subcategories/by-category/:categoryId', isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const subCategories = await storage.getSubCategoriesByCategory(categoryId);
      res.json(subCategories);
    } catch (error) {
      console.error("Error fetching subcategories by category:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.post('/api/subcategories', isAuthenticated, async (req, res) => {
    try {
      const data = insertAssetSubCategorySchema.parse(req.body);
      const subCategory = await storage.createSubCategory(data);
      res.status(201).json(subCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating subcategory:", error);
        res.status(500).json({ message: "Failed to create subcategory" });
      }
    }
  });

  app.put('/api/subcategories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetSubCategorySchema.partial().parse(req.body);
      const subCategory = await storage.updateSubCategory(id, data);
      if (!subCategory) {
        return res.status(404).json({ message: "SubCategory not found" });
      }
      res.json(subCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating subcategory:", error);
        res.status(500).json({ message: "Failed to update subcategory" });
      }
    }
  });

  app.delete('/api/subcategories/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSubCategory(id);
      if (!success) {
        return res.status(404).json({ message: "SubCategory not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      res.status(500).json({ message: "Failed to delete subcategory" });
    }
  });

  // Asset routes
  app.get('/api/assets', isAuthenticated, async (req, res) => {
    try {
      const assets = await storage.getAssetsWithAssignmentStatus();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get('/api/assets/recent', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const assets = await storage.getRecentAssets(limit);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching recent assets:", error);
      res.status(500).json({ message: "Failed to fetch recent assets" });
    }
  });

  app.get('/api/assets/generate-code', isAuthenticated, async (req, res) => {
    try {
      const code = await storage.generateAssetCode();
      res.json({ code });
    } catch (error) {
      console.error("Error generating asset code:", error);
      res.status(500).json({ message: "Failed to generate asset code" });
    }
  });

  app.get('/api/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const asset = await storage.getAsset(id);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching asset:", error);
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req, res) => {
    try {
      let data = insertAssetSchema.parse(req.body);

      // Auto-generate code if not provided or empty
      if (!data.code || data.code.trim() === '') {
        data = { ...data, code: await storage.generateAssetCode() };
      } else {
        // Check for duplicate code
        const existing = await storage.getAssetByCode(data.code);
        if (existing) {
          return res.status(400).json({ message: "Asset code already exists" });
        }
      }

      const asset = await storage.createAsset(data);
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating asset:", error);
        res.status(500).json({ message: "Failed to create asset" });
      }
    }
  });

  app.put('/api/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetSchema.partial().parse(req.body);

      // Check for duplicate code if code is being changed
      if (data.code) {
        const existing = await storage.getAssetByCode(data.code);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: "Asset code already exists" });
        }
      }

      const asset = await storage.updateAsset(id, data);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating asset:", error);
        res.status(500).json({ message: "Failed to update asset" });
      }
    }
  });

  app.delete('/api/assets/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAsset(id);
      if (!success) {
        return res.status(404).json({ message: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Assignee routes
  app.get('/api/assignees', isAuthenticated, async (req, res) => {
    try {
      const assignees = await storage.getAssignees();
      res.json(assignees);
    } catch (error) {
      console.error("Error fetching assignees:", error);
      res.status(500).json({ message: "Failed to fetch assignees" });
    }
  });

  app.get('/api/assignees/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignee = await storage.getAssignee(id);
      if (!assignee) {
        return res.status(404).json({ message: "Assignee not found" });
      }
      res.json(assignee);
    } catch (error) {
      console.error("Error fetching assignee:", error);
      res.status(500).json({ message: "Failed to fetch assignee" });
    }
  });

  app.post('/api/assignees', isAuthenticated, async (req, res) => {
    try {
      const data = insertAssigneeSchema.parse(req.body);

      // Check for duplicate employee ID
      const existing = await storage.getAssigneeByEmployeeId(data.employeeId);
      if (existing) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }

      const assignee = await storage.createAssignee(data);
      res.status(201).json(assignee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating assignee:", error);
        res.status(500).json({ message: "Failed to create assignee" });
      }
    }
  });

  app.put('/api/assignees/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssigneeSchema.partial().parse(req.body);

      // Check for duplicate employee ID if it's being changed
      if (data.employeeId) {
        const existing = await storage.getAssigneeByEmployeeId(data.employeeId);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: "Employee ID already exists" });
        }
      }

      const assignee = await storage.updateAssignee(id, data);
      if (!assignee) {
        return res.status(404).json({ message: "Assignee not found" });
      }
      res.json(assignee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating assignee:", error);
        res.status(500).json({ message: "Failed to update assignee" });
      }
    }
  });

  app.delete('/api/assignees/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssignee(id);
      if (!success) {
        return res.status(404).json({ message: "Assignee not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignee:", error);
      res.status(500).json({ message: "Failed to delete assignee" });
    }
  });

  // Assignment routes
  app.get('/api/assignments', isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get('/api/assignments/recent', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const assignments = await storage.getRecentAssignments(limit);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching recent assignments:", error);
      res.status(500).json({ message: "Failed to fetch recent assignments" });
    }
  });

  app.get('/api/assignments/by-asset/:assetId', isAuthenticated, async (req, res) => {
    try {
      const assetId = parseInt(req.params.assetId);
      const assignmentHistory = await storage.getAssignmentsByAssetId(assetId);
      res.json(assignmentHistory);
    } catch (error) {
      console.error("Error fetching assignment history:", error);
      res.status(500).json({ message: "Failed to fetch assignment history" });
    }
  });

  app.get('/api/assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.post('/api/assignments', isAuthenticated, async (req, res) => {
    try {
      const data = insertAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(data);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating assignment:", error);
        res.status(500).json({ message: "Failed to create assignment" });
      }
    }
  });

  app.put('/api/assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssignmentSchema.partial().parse(req.body);
      const assignment = await storage.updateAssignment(id, data);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating assignment:", error);
        res.status(500).json({ message: "Failed to update assignment" });
      }
    }
  });

  app.delete('/api/assignments/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssignment(id);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Backup/Restore routes
  app.get('/api/backup', isAuthenticated, async (req, res) => {
    try {
      const sql = await storage.backupDatabase();
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', 'attachment; filename="backup.sql"');
      res.send(sql);
    } catch (error) {
      console.error("Error generating backup:", error);
      res.status(500).json({ message: "Failed to generate backup" });
    }
  });

  app.post('/api/restore', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // express.text() should populate req.body as a string if header is text/plain or application/sql
      const sqlContent = req.body;

      if (!sqlContent || typeof sqlContent !== 'string' || sqlContent.trim().length === 0) {
        return res.status(400).json({ message: "Invalid SQL content. Please ensure the file is not empty." });
      }

      await storage.restoreDatabase(sqlContent);
      res.status(200).json({ message: "Database restored successfully" });
    } catch (error) {
      console.error("Error restoring database:", error);
      res.status(500).json({ message: "Failed to restore database" });
    }
  });

  return httpServer;
}
