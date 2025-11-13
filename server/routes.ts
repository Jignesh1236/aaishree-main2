import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReportSchema } from "@shared/schema";
import { setupAuth, requireAuth, hashPassword, comparePasswords, getUserByUsername } from "./auth";
import { MongoClient, ObjectId } from "mongodb";

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

  app.post("/api/reports", async (req: Request, res: Response) => {
    try {
      const validatedData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(validatedData);
      res.json(report);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/reports", async (req: Request, res: Response) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/:id", async (req: Request, res: Response) => {
    try {
      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports/date/:date", async (req: Request, res: Response) => {
    try {
      const reports = await storage.getReportsByDate(req.params.date);
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update a report (admin only)
  app.put("/api/reports/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const reportId = req.params.id;
      const reportData = req.body;
      const result = await storage.updateReport(reportId, reportData);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a report (admin only)
  app.delete("/api/reports/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const reportId = req.params.id;
      const result = await storage.deleteReport(reportId);
      res.json({ success: true, message: "Report deleted successfully" });
    } catch (error: any) {
      const statusCode = error.message === 'Report not found' ? 404 : 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}