import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  insertDepartmentSchema,
  insertEmployeeSchema,
  insertPayrollRecordSchema,
  insertManufacturerSchema,
  insertLocationSchema,
  insertAssetCategorySchema,
  insertAssetSubCategorySchema,
  insertAssetSchema,
  insertAssetAssignmentSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get("/api/dashboard/departments", isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      const data = departments.map((d) => ({
        name: d.name,
        count: d.employeeCount,
      }));
      res.json(data);
    } catch (error) {
      console.error("Error fetching department distribution:", error);
      res.status(500).json({ message: "Failed to fetch data" });
    }
  });

  app.get("/api/dashboard/payroll-history", isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getPayrollHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching payroll history:", error);
      res.status(500).json({ message: "Failed to fetch data" });
    }
  });

  // Department routes
  app.get("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.get("/api/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const department = await storage.getDepartment(id);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error fetching department:", error);
      res.status(500).json({ message: "Failed to fetch department" });
    }
  });

  app.post("/api/departments", isAuthenticated, async (req, res) => {
    try {
      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      res.status(201).json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating department:", error);
        res.status(500).json({ message: "Failed to create department" });
      }
    }
  });

  app.put("/api/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, data);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating department:", error);
        res.status(500).json({ message: "Failed to update department" });
      }
    }
  });

  app.delete("/api/departments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDepartment(id);
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const employee = await storage.getEmployee(id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating employee:", error);
        res.status(500).json({ message: "Failed to create employee" });
      }
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, data);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: "Failed to update employee" });
      }
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEmployee(id);
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Payroll routes
  app.get("/api/payroll", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getPayrollRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ message: "Failed to fetch payroll records" });
    }
  });

  app.get("/api/payroll/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.getPayrollRecord(id);
      if (!record) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching payroll record:", error);
      res.status(500).json({ message: "Failed to fetch payroll record" });
    }
  });

  app.post("/api/payroll", isAuthenticated, async (req, res) => {
    try {
      const data = insertPayrollRecordSchema.parse(req.body);
      const record = await storage.createPayrollRecord(data);
      res.status(201).json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating payroll record:", error);
        res.status(500).json({ message: "Failed to create payroll record" });
      }
    }
  });

  app.put("/api/payroll/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertPayrollRecordSchema.partial().parse(req.body);
      const record = await storage.updatePayrollRecord(id, data);
      if (!record) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error updating payroll record:", error);
        res.status(500).json({ message: "Failed to update payroll record" });
      }
    }
  });

  app.delete("/api/payroll/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePayrollRecord(id);
      if (!success) {
        return res.status(404).json({ message: "Payroll record not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payroll record:", error);
      res.status(500).json({ message: "Failed to delete payroll record" });
    }
  });

  // ==================== ASSET MANAGEMENT ROUTES ====================

  // Manufacturer routes
  app.get("/api/manufacturers", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getManufacturers();
      res.json(result);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch manufacturers" });
    }
  });

  app.get("/api/manufacturers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const m = await storage.getManufacturer(id);
      if (!m) return res.status(404).json({ message: "Manufacturer not found" });
      res.json(m);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manufacturer" });
    }
  });

  app.post("/api/manufacturers", isAuthenticated, async (req, res) => {
    try {
      const data = insertManufacturerSchema.parse(req.body);
      const m = await storage.createManufacturer(data);
      res.status(201).json(m);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create manufacturer" });
      }
    }
  });

  app.put("/api/manufacturers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertManufacturerSchema.partial().parse(req.body);
      const m = await storage.updateManufacturer(id, data);
      if (!m) return res.status(404).json({ message: "Manufacturer not found" });
      res.json(m);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update manufacturer" });
      }
    }
  });

  app.delete("/api/manufacturers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteManufacturer(id);
      if (!success) return res.status(404).json({ message: "Manufacturer not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete manufacturer" });
    }
  });

  // Location routes
  app.get("/api/locations", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getLocations();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const l = await storage.getLocation(id);
      if (!l) return res.status(404).json({ message: "Location not found" });
      res.json(l);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  app.post("/api/locations", isAuthenticated, async (req, res) => {
    try {
      const data = insertLocationSchema.parse(req.body);
      const l = await storage.createLocation(data);
      res.status(201).json(l);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create location" });
      }
    }
  });

  app.put("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertLocationSchema.partial().parse(req.body);
      const l = await storage.updateLocation(id, data);
      if (!l) return res.status(404).json({ message: "Location not found" });
      res.json(l);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update location" });
      }
    }
  });

  app.delete("/api/locations/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteLocation(id);
      if (!success) return res.status(404).json({ message: "Location not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Asset Category routes
  app.get("/api/asset-categories", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getAssetCategories();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/asset-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const c = await storage.getAssetCategory(id);
      if (!c) return res.status(404).json({ message: "Category not found" });
      res.json(c);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  app.post("/api/asset-categories", isAuthenticated, async (req, res) => {
    try {
      const data = insertAssetCategorySchema.parse(req.body);
      const c = await storage.createAssetCategory(data);
      res.status(201).json(c);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.put("/api/asset-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetCategorySchema.partial().parse(req.body);
      const c = await storage.updateAssetCategory(id, data);
      if (!c) return res.status(404).json({ message: "Category not found" });
      res.json(c);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update category" });
      }
    }
  });

  app.delete("/api/asset-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssetCategory(id);
      if (!success) return res.status(404).json({ message: "Category not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Asset SubCategory routes
  app.get("/api/asset-subcategories", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getAssetSubCategories();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.get("/api/asset-subcategories/by-category/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const result = await storage.getAssetSubCategoriesByCategory(categoryId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.get("/api/asset-subcategories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sc = await storage.getAssetSubCategory(id);
      if (!sc) return res.status(404).json({ message: "Subcategory not found" });
      res.json(sc);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subcategory" });
    }
  });

  app.post("/api/asset-subcategories", isAuthenticated, async (req, res) => {
    try {
      const data = insertAssetSubCategorySchema.parse(req.body);
      const sc = await storage.createAssetSubCategory(data);
      res.status(201).json(sc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create subcategory" });
      }
    }
  });

  app.put("/api/asset-subcategories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetSubCategorySchema.partial().parse(req.body);
      const sc = await storage.updateAssetSubCategory(id, data);
      if (!sc) return res.status(404).json({ message: "Subcategory not found" });
      res.json(sc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update subcategory" });
      }
    }
  });

  app.delete("/api/asset-subcategories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssetSubCategory(id);
      if (!success) return res.status(404).json({ message: "Subcategory not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete subcategory" });
    }
  });

  // Asset routes
  app.get("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getAssets();
      res.json(result);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/recent", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getRecentAssets(5);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent assets" });
    }
  });

  app.get("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const a = await storage.getAsset(id);
      if (!a) return res.status(404).json({ message: "Asset not found" });
      res.json(a);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const data = insertAssetSchema.parse(req.body);
      const a = await storage.createAsset(data);
      res.status(201).json(a);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating asset:", error);
        res.status(500).json({ message: "Failed to create asset" });
      }
    }
  });

  app.put("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetSchema.partial().parse(req.body);
      const a = await storage.updateAsset(id, data);
      if (!a) return res.status(404).json({ message: "Asset not found" });
      res.json(a);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update asset" });
      }
    }
  });

  app.delete("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAsset(id);
      if (!success) return res.status(404).json({ message: "Asset not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Asset Assignment routes
  app.get("/api/asset-assignments", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getAssetAssignments();
      res.json(result);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/asset-assignments/recent", isAuthenticated, async (req, res) => {
    try {
      const result = await storage.getRecentAssetAssignments(5);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent assignments" });
    }
  });

  app.get("/api/asset-assignments/by-asset/:assetId", isAuthenticated, async (req, res) => {
    try {
      const assetId = parseInt(req.params.assetId);
      const result = await storage.getAssetAssignmentsByAsset(assetId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get("/api/asset-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const a = await storage.getAssetAssignment(id);
      if (!a) return res.status(404).json({ message: "Assignment not found" });
      res.json(a);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.post("/api/asset-assignments", isAuthenticated, async (req, res) => {
    try {
      const data = insertAssetAssignmentSchema.parse(req.body);
      const a = await storage.createAssetAssignment(data);
      res.status(201).json(a);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating assignment:", error);
        res.status(500).json({ message: "Failed to create assignment" });
      }
    }
  });

  app.put("/api/asset-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertAssetAssignmentSchema.partial().parse(req.body);
      const a = await storage.updateAssetAssignment(id, data);
      if (!a) return res.status(404).json({ message: "Assignment not found" });
      res.json(a);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update assignment" });
      }
    }
  });

  app.delete("/api/asset-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssetAssignment(id);
      if (!success) return res.status(404).json({ message: "Assignment not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Asset Dashboard stats
  app.get("/api/dashboard/asset-stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getAssetDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching asset stats:", error);
      res.status(500).json({ message: "Failed to fetch asset stats" });
    }
  });

  return httpServer;
}
