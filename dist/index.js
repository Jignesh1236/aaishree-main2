// server/index.ts
import express2 from "express";

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
  netProfit: z.string()
});
var reportSchema = insertReportSchema.extend({
  id: z.string(),
  createdAt: z.date()
});
var insertUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters")
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
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { MongoClient as MongoClient2, ObjectId as ObjectId2 } from "mongodb";
var scryptAsync = promisify(scrypt);
var MemorySessionStore = MemoryStore(session);
var client2 = null;
var dbConnected = false;
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
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "adsc-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
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
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
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
async function registerRoutes(app2) {
  setupAuth(app2);
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
  app2.delete("/api/reports/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteReport(req.params.id);
      res.json({ success: true });
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
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
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
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
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
