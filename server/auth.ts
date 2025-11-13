import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import rateLimit from "express-rate-limit";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";
import { insertUserSchema, type User } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);
const MemorySessionStore = MemoryStore(session);

let client: MongoClient | null = null;
let dbConnected = false;

const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: { error: "Too many accounts created. Please try again after 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

async function getDb() {
  if (!client) {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.warn('\x1b[33m⚠ MONGODB_URI not set - authentication features will be limited\x1b[0m');
      return null;
    }
    
    let finalUri = mongoUri;
    if (!mongoUri.includes('retryWrites')) {
      const separator = mongoUri.includes('?') ? '&' : '?';
      finalUri = `${mongoUri}${separator}retryWrites=true&w=majority`;
    }
    
    try {
      client = new MongoClient(finalUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true,
      });
      
      await client.connect();
      dbConnected = true;
      console.log('\x1b[32m✓ MongoDB connected for authentication\x1b[0m');
    } catch (error) {
      console.warn('\x1b[33m⚠ MongoDB connection failed - app will run with limited features\x1b[0m');
      console.warn('\x1b[90m  Error:', error instanceof Error ? error.message : error, '\x1b[0m');
      return null;
    }
  }
  
  return client ? client.db('adsc_reports') : null;
}

function checkAccountLockout(username: string): { locked: boolean; remainingTime?: number } {
  const attempt = loginAttempts.get(username);
  if (!attempt) return { locked: false };

  if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    const remainingTime = Math.ceil((attempt.lockedUntil - Date.now()) / 1000 / 60);
    return { locked: true, remainingTime };
  }

  if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
    loginAttempts.delete(username);
    return { locked: false };
  }

  return { locked: false };
}

function recordFailedLogin(username: string) {
  const attempt = loginAttempts.get(username) || { count: 0, lastAttempt: Date.now() };
  
  const timeSinceLastAttempt = Date.now() - attempt.lastAttempt;
  if (timeSinceLastAttempt > 15 * 60 * 1000) {
    attempt.count = 1;
  } else {
    attempt.count += 1;
  }
  
  attempt.lastAttempt = Date.now();
  
  if (attempt.count >= 5) {
    attempt.lockedUntil = Date.now() + (30 * 60 * 1000); // Lock for 30 minutes
  }
  
  loginAttempts.set(username, attempt);
}

function clearFailedLogins(username: string) {
  loginAttempts.delete(username);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;
  const usersCollection = db.collection('users');
  return await usersCollection.findOne({ username });
}

async function getUserById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const usersCollection = db.collection('users');
  return await usersCollection.findOne({ _id: new ObjectId(id) });
}

async function ensureAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  try {
    const db = await getDb();
    if (!db) {
      console.warn('\x1b[33m⚠ Skipping admin user creation - database not connected\x1b[0m');
      return;
    }
    const usersCollection = db.collection('users');
    
    const existingAdmin = await usersCollection.findOne({ username: adminUsername });
    
    if (!existingAdmin) {
      await usersCollection.insertOne({
        username: adminUsername,
        password: await hashPassword(adminPassword),
        createdAt: new Date(),
      });
      console.log(`\x1b[32m✓ Admin user created: ${adminUsername}\x1b[0m`);
    } else {
      console.log(`\x1b[32m✓ Admin user already exists: ${adminUsername}\x1b[0m`);
    }
  } catch (error) {
    console.error('\x1b[31m✗ Failed to create admin user\x1b[0m');
    console.error('\x1b[90m  Error:', error, '\x1b[0m');
  }
}

export function setupAuth(app: Express) {
  ensureAdminUser();
  
  const store = new MemorySessionStore({ checkPeriod: 86400000 });
  
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  if (!process.env.SESSION_SECRET) {
    console.warn('\x1b[33m⚠ SESSION_SECRET not set - using random generated secret (sessions will not persist across restarts)\x1b[0m');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours instead of 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // CSRF protection
    },
    name: 'sessionId', // Hide default session cookie name
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

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
        if (!user || !(await comparePasswords(password, user.password))) {
          recordFailedLogin(username);
          return done(null, false, { message: "Invalid username or password" });
        } else {
          clearFailedLogins(username);
          return done(null, {
            id: user._id.toString(),
            username: user.username,
            createdAt: user.createdAt,
          });
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await getUserById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
      });
    } catch (error) {
      done(error);
    }
  });


  app.post("/api/login", loginLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
