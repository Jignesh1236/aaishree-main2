// server/index.ts
import express2 from "express";
import helmet from "helmet";

// server/routes.ts
import { createServer } from "http";

// server/mongodb.ts
import { MongoClient, ObjectId } from "mongodb";
var client = null;
var db = null;
async function connectToMongoDB() {
  if (db) return db;
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("\u26A0\uFE0F  MONGODB_URI not set - storage features will be limited");
    return null;
  }
  let finalUri = mongoUri;
  if (!mongoUri.includes("retryWrites")) {
    const separator = mongoUri.includes("?") ? "&" : "?";
    finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
  }
  try {
    client = new MongoClient(finalUri, {
      serverSelectionTimeoutMS: 1e4,
      connectTimeoutMS: 15e3,
      tls: true,
      tlsAllowInvalidCertificates: true
    });
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    db = client.db("adsc_reports");
    console.log("\u2705 Connected to MongoDB successfully");
    return db;
  } catch (error) {
    console.warn("\u26A0\uFE0F  MongoDB connection failed - app will run with limited features");
    console.warn("Error details:", error instanceof Error ? error.message : error);
    return null;
  }
}
var MongoStorage = class {
  collection = null;
  async getCollection() {
    if (this.collection) return this.collection;
    const database = await connectToMongoDB();
    if (!database) return null;
    this.collection = database.collection("reports");
    await this.collection.createIndex({ date: 1 }, { unique: true });
    return this.collection;
  }
  async createReport(insertReport) {
    const collection = await this.getCollection();
    if (!collection) {
      throw new Error("Database not available - please set MONGODB_URI");
    }
    const report = {
      date: insertReport.date,
      services: insertReport.services || [],
      expenses: insertReport.expenses || [],
      totalServices: insertReport.totalServices,
      totalExpenses: insertReport.totalExpenses,
      netProfit: insertReport.netProfit,
      createdAt: /* @__PURE__ */ new Date()
    };
    const result = await collection.insertOne(report);
    return {
      id: result.insertedId.toString(),
      ...report
    };
  }
  async getReports() {
    const collection = await this.getCollection();
    if (!collection) {
      return [];
    }
    const reports = await collection.find({}).sort({ date: -1 }).toArray();
    return reports.map((doc) => ({
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      createdAt: doc.createdAt
    }));
  }
  async getReportById(id) {
    const collection = await this.getCollection();
    if (!collection) {
      return void 0;
    }
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return void 0;
    }
    const doc = await collection.findOne({ _id: objectId });
    if (!doc) return void 0;
    return {
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      createdAt: doc.createdAt
    };
  }
  async getReportByDate(date) {
    const collection = await this.getCollection();
    if (!collection) {
      return void 0;
    }
    const doc = await collection.findOne({ date });
    if (!doc) return void 0;
    return {
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      createdAt: doc.createdAt
    };
  }
  async deleteReport(id) {
    const collection = await this.getCollection();
    if (!collection) {
      throw new Error("Database not available - please set MONGODB_URI");
    }
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new Error("Invalid report ID");
    }
    await collection.deleteOne({ _id: objectId });
  }
  async updateReport(id, reportData) {
    const collection = await this.getCollection();
    if (!collection) {
      throw new Error("Database not available - please set MONGODB_URI");
    }
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new Error("Invalid report ID");
    }
    const updateData = {};
    if (reportData.services !== void 0) updateData.services = reportData.services;
    if (reportData.expenses !== void 0) updateData.expenses = reportData.expenses;
    if (reportData.totalServices !== void 0) updateData.totalServices = reportData.totalServices;
    if (reportData.totalExpenses !== void 0) updateData.totalExpenses = reportData.totalExpenses;
    if (reportData.netProfit !== void 0) updateData.netProfit = reportData.netProfit;
    await collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );
    return { success: true };
  }
};
var mongoStorage = new MongoStorage();

// server/storage.ts
var storage = mongoStorage;

// shared/schema.ts
import { z } from "zod";
var serviceItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Service name is required"),
  amount: z.number().min(0, "Amount must be positive")
});
var expenseItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Expense name is required"),
  amount: z.number().min(0, "Amount must be positive")
});
var insertReportSchema = z.object({
  date: z.string(),
  services: z.array(serviceItemSchema).default([]),
  expenses: z.array(expenseItemSchema).default([]),
  totalServices: z.string(),
  totalExpenses: z.string(),
  netProfit: z.string(),
  onlinePayment: z.string().optional().default("0")
});
var reportSchema = insertReportSchema.extend({
  id: z.string(),
  createdAt: z.date()
});
var insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must not exceed 30 characters").regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must not exceed 100 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[0-9]/, "Password must contain at least one number").regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
});
var userSchema = insertUserSchema.extend({
  id: z.string(),
  createdAt: z.date()
});

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import MemoryStore from "memorystore";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { MongoClient as MongoClient2, ObjectId as ObjectId2 } from "mongodb";
var scryptAsync = promisify(scrypt);
var MemorySessionStore = MemoryStore(session);
var client2 = null;
var dbConnected = false;
var loginAttempts = /* @__PURE__ */ new Map();
var loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 5,
  // 5 attempts per window
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});
var registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 3,
  // 3 registrations per hour per IP
  message: { error: "Too many accounts created. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false
});
async function getDb() {
  if (!client2) {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn("\u26A0\uFE0F  MONGODB_URI not set - authentication features will be limited");
      return null;
    }
    let finalUri = mongoUri;
    if (!mongoUri.includes("retryWrites")) {
      const separator = mongoUri.includes("?") ? "&" : "?";
      finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
    }
    try {
      client2 = new MongoClient2(finalUri, {
        serverSelectionTimeoutMS: 1e4,
        connectTimeoutMS: 15e3,
        tls: true,
        tlsAllowInvalidCertificates: true
      });
      await client2.connect();
      dbConnected = true;
      console.log("\u2705 MongoDB connected for auth");
    } catch (error) {
      console.warn("\u26A0\uFE0F  MongoDB connection failed - app will run with limited features:", error instanceof Error ? error.message : error);
      return null;
    }
  }
  return client2 ? client2.db("adsc_reports") : null;
}
function checkAccountLockout(username) {
  const attempt = loginAttempts.get(username);
  if (!attempt) return { locked: false };
  if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    const remainingTime = Math.ceil((attempt.lockedUntil - Date.now()) / 1e3 / 60);
    return { locked: true, remainingTime };
  }
  if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
    loginAttempts.delete(username);
    return { locked: false };
  }
  return { locked: false };
}
function recordFailedLogin(username) {
  const attempt = loginAttempts.get(username) || { count: 0, lastAttempt: Date.now() };
  const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
  if (timeSinceLastAttempt > 15 * 60 * 1e3) {
    attempt.count = 1;
  } else {
    attempt.count += 1;
  }
  attempt.lastAttempt = Date.now();
  if (attempt.count >= 5) {
    attempt.lockedUntil = Date.now() + 30 * 60 * 1e3;
  }
  loginAttempts.set(username, attempt);
}
function clearFailedLogins(username) {
  loginAttempts.delete(username);
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
async function getUserByUsername(username) {
  const db2 = await getDb();
  if (!db2) return null;
  const usersCollection = db2.collection("users");
  return await usersCollection.findOne({ username });
}
async function getUserById(id) {
  const db2 = await getDb();
  if (!db2) return null;
  const usersCollection = db2.collection("users");
  return await usersCollection.findOne({ _id: new ObjectId2(id) });
}
async function ensureAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  try {
    const db2 = await getDb();
    if (!db2) {
      console.warn("\u26A0\uFE0F  Skipping admin user creation - database not connected");
      return;
    }
    const usersCollection = db2.collection("users");
    const existingAdmin = await usersCollection.findOne({ username: adminUsername });
    if (!existingAdmin) {
      await usersCollection.insertOne({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        createdAt: /* @__PURE__ */ new Date()
      });
      console.log(`\u2705 Admin user created: ${adminUsername}`);
    } else {
      console.log(`\u2705 Admin user already exists: ${adminUsername}`);
    }
  } catch (error) {
    console.error("\u26A0\uFE0F  Failed to create admin user:", error);
  }
}
function setupAuth(app2) {
  ensureAdminUser();
  const store = new MemorySessionStore({ checkPeriod: 864e5 });
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
  if (!process.env.SESSION_SECRET) {
    console.warn("\u26A0\uFE0F  SESSION_SECRET not set - using random generated secret (sessions will not persist across restarts)");
  }
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 24 * 60 * 60 * 1e3,
      // 24 hours instead of 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
      // CSRF protection
    },
    name: "sessionId"
    // Hide default session cookie name
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const lockout = checkAccountLockout(username);
        if (lockout.locked) {
          return done(null, false, {
            message: `Account temporarily locked. Try again in ${lockout.remainingTime} minutes.`
          });
        }
        const user = await getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          recordFailedLogin(username);
          return done(null, false, { message: "Invalid username or password" });
        } else {
          clearFailedLogins(username);
          return done(null, {
            id: user._id.toString(),
            username: user.username,
            createdAt: user.createdAt
          });
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt
      });
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/login", loginLimiter, (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err2) => {
        if (err2) {
          return next(err2);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// server/routes.ts
import { MongoClient as MongoClient3 } from "mongodb";
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.post("/api/change-password", requireAuth, async (req, res) => {
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
      if (!mongoUri.includes("retryWrites")) {
        const separator = mongoUri.includes("?") ? "&" : "?";
        finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
      }
      const client3 = new MongoClient3(finalUri, {
        serverSelectionTimeoutMS: 1e4,
        connectTimeoutMS: 15e3,
        tls: true,
        tlsAllowInvalidCertificates: true
      });
      await client3.connect();
      const db2 = client3.db("adsc_reports");
      const usersCollection = db2.collection("users");
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { password: hashedNewPassword } }
      );
      await client3.close();
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/reports", async (req, res) => {
    try {
      const validatedData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(validatedData);
      res.json(report);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/reports", async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/reports/:id", async (req, res) => {
    try {
      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/reports/date/:date", async (req, res) => {
    try {
      const report = await storage.getReportByDate(req.params.date);
      if (!report) {
        return res.status(404).json({ error: "Report not found for this date" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/reports/:id", requireAuth, async (req, res) => {
    try {
      const reportId = req.params.id;
      const reportData = req.body;
      const result = await storage.updateReport(reportId, reportData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  app2.delete("/api/reports/:id", requireAuth, async (req, res) => {
    try {
      const reportId = req.params.id;
      const result = await storage.deleteReport(reportId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
