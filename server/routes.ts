import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReportSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import { setupAuth, requireAuth, requireRole, requireAdmin, hashPassword, comparePasswords, getUserByUsername, logActivity } from "./auth";
import { MongoClient, ObjectId } from "mongodb";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Change password endpoint
  app.post("/api/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }

      const username = req.user?.username;
      if (!username) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const usersCollection = db.collection('users');

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { password: hashedNewPassword } }
      );

      await client.close();

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports", requireAuth, async (req: Request, res: Response) => {
    try {
      const reportData = {
        ...req.body,
        createdBy: req.user?.id,
        createdByUsername: req.user?.username,
      };
      
      const validatedData = insertReportSchema.parse(reportData);
      const report = await storage.createReport(validatedData);
      
      if (req.user) {
        await logActivity(req.user.id, req.user.username, "report_created", {
          resourceType: "report",
          resourceId: report.id,
          metadata: { date: report.date },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/reports", requireAuth, async (req: Request, res: Response) => {
    try {
      const reports = await storage.getReports();
      
      if (req.user?.role === "employee") {
        const filteredReports = reports.filter(r => r.createdBy === req.user?.id);
        return res.json(filteredReports);
      }
      
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      if (req.user?.role === "employee" && report.createdBy !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden: You can only access reports you created" });
      }
      
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/date/:date", requireAuth, async (req: Request, res: Response) => {
    try {
      const reports = await storage.getReportsByDate(req.params.date);
      
      if (req.user?.role === "employee") {
        const filteredReports = reports.filter(r => r.createdBy === req.user?.id);
        return res.json(filteredReports);
      }
      
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a report (admin/manager only)
  app.put("/api/reports/:id", requireAuth, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const reportId = req.params.id;
      const reportData = req.body;
      const result = await storage.updateReport(reportId, reportData);
      
      if (req.user) {
        await logActivity(req.user.id, req.user.username, "report_updated", {
          resourceType: "report",
          resourceId: reportId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a report (admin only)
  app.delete("/api/reports/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const reportId = req.params.id;
      const result = await storage.deleteReport(reportId);
      
      if (req.user) {
        await logActivity(req.user.id, req.user.username, "report_deleted", {
          resourceType: "report",
          resourceId: reportId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ success: true, message: "Report deleted successfully" });
    } catch (error: any) {
      const statusCode = error.message === 'Report not found' ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  // Employee Self-Registration (Public)
  app.post("/api/register-employee", async (req: Request, res: Response) => {
    try {
      const validationResult = insertUserSchema.safeParse({
        ...req.body,
        role: 'employee' // Force employee role for self-registration
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: fromZodError(validationResult.error).message 
        });
      }
      
      const { username, password, email } = validationResult.data;

      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const usersCollection = db.collection('users');
      
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        await client.close();
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const hashedPassword = await hashPassword(password);
      const newUser = {
        username,
        password: hashedPassword,
        email: email || undefined,
        role: 'employee',
        isActive: true,
        createdAt: new Date(),
      };
      
      const result = await usersCollection.insertOne(newUser);
      await client.close();
      
      res.json({ 
        id: result.insertedId.toString(),
        username,
        message: "Employee registration successful" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User Management Routes (Admin only)
  
  // Get all users (Admin only)
  app.get("/api/users", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const usersCollection = db.collection('users');
      
      const users = await usersCollection
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      
      await client.close();
      
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new user (Admin only)
  app.post("/api/users", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: fromZodError(validationResult.error).message 
        });
      }
      
      const { username, password, email, role } = validationResult.data;

      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const usersCollection = db.collection('users');
      
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        await client.close();
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const hashedPassword = await hashPassword(password);
      const newUser = {
        username,
        password: hashedPassword,
        email: email || undefined,
        role: role || 'employee',
        isActive: true,
        createdAt: new Date(),
      };
      
      const result = await usersCollection.insertOne(newUser);
      await client.close();
      
      if (req.user) {
        await logActivity(req.user.id, req.user.username, "user_created", {
          resourceType: "user",
          resourceId: result.insertedId.toString(),
          metadata: { username, role: role || 'employee' },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ 
        id: result.insertedId.toString(),
        username,
        email,
        role: role || 'employee',
        message: "User created successfully" 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update user (Admin only)
  app.put("/api/users/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      
      const validationResult = updateUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: fromZodError(validationResult.error).message 
        });
      }
      
      const { email, role, isActive } = validationResult.data;
      
      if (req.user?.id === userId && role && role !== req.user.role) {
        return res.status(400).json({ error: "Cannot change your own role" });
      }

      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const usersCollection = db.collection('users');
      
      const updateData: any = {};
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: updateData }
      );
      
      await client.close();
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (req.user) {
        await logActivity(req.user.id, req.user.username, "user_updated", {
          resourceType: "user",
          resourceId: userId,
          metadata: updateData,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ message: "User updated successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete user (Admin only)
  app.delete("/api/users/:id", requireAuth, requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      
      if (req.user?.id === userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const usersCollection = db.collection('users');
      
      const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
      await client.close();
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (req.user) {
        await logActivity(req.user.id, req.user.username, "user_deleted", {
          resourceType: "user",
          resourceId: userId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Activity Log Routes (Admin/Manager only - PROTECTED)
  app.get("/api/activity-logs", requireAuth, requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
      if (!mongoUri) {
        return res.status(500).json({ error: "Database not configured" });
      }

      let finalUri = mongoUri;
      if (!mongoUri.includes('retryWrites')) {
        const separator = mongoUri.includes('?') ? '&' : '?';
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }

      const client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });

      await client.connect();
      const db = client.db('adsc_reports');
      const activityLogsCollection = db.collection('activity_logs');
      
      const limit = parseInt(req.query.limit as string) || 100;
      const userId = req.query.userId as string;
      
      const filter = userId ? { userId } : {};
      
      const logs = await activityLogsCollection
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
      
      await client.close();
      
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
