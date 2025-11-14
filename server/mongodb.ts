
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { Report, InsertReport } from '@shared/schema';
import type { IStorage } from './storage';

let client: MongoClient | null = null;
let db: Db | null = null;

async function connectToMongoDB(): Promise<Db | null> {
  if (db) return db;

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.warn('\x1b[33m⚠ MONGODB_URI not set - storage features will be limited\x1b[0m');
    return null;
  }

  // Ensure the URI has retryWrites parameter
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
    await client.db('admin').command({ ping: 1 });
    
    db = client.db('adsc_reports');
    
    console.log('\x1b[32m✓ Connected to MongoDB successfully\x1b[0m');
    return db;
  } catch (error) {
    console.warn('\x1b[33m⚠ MongoDB connection failed - app will run with limited features\x1b[0m');
    console.warn('\x1b[90m  Error:', error instanceof Error ? error.message : error, '\x1b[0m');
    return null;
  }
}

export class MongoStorage implements IStorage {
  private collection: Collection<any> | null = null;

  private async getCollection(): Promise<Collection<any> | null> {
    if (this.collection) return this.collection;
    
    const database = await connectToMongoDB();
    if (!database) return null;
    
    this.collection = database.collection('reports');
    
    try {
      await this.collection.dropIndex('date_1');
    } catch (error) {
      // Index doesn't exist, which is fine
    }
    
    await this.collection.createIndex({ date: 1 });
    
    return this.collection;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const collection = await this.getCollection();
    if (!collection) {
      throw new Error('Database not available - please set MONGODB_URI');
    }
    
    const report = {
      date: insertReport.date,
      services: insertReport.services || [],
      expenses: insertReport.expenses || [],
      totalServices: insertReport.totalServices,
      totalExpenses: insertReport.totalExpenses,
      netProfit: insertReport.netProfit,
      onlinePayment: insertReport.onlinePayment || "0",
      createdBy: insertReport.createdBy,
      createdByUsername: insertReport.createdByUsername,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(report);
    
    return {
      id: result.insertedId.toString(),
      ...report,
    } as Report;
  }

  async getReports(): Promise<Report[]> {
    const collection = await this.getCollection();
    if (!collection) {
      return [];
    }
    
    const reports = await collection
      .find({})
      .sort({ date: -1 })
      .toArray();

    return reports.map((doc: any) => ({
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      onlinePayment: doc.onlinePayment || "0",
      createdBy: doc.createdBy,
      createdByUsername: doc.createdByUsername,
      createdAt: doc.createdAt,
    }));
  }

  async getReportById(id: string): Promise<Report | undefined> {
    const collection = await this.getCollection();
    if (!collection) {
      return undefined;
    }
    
    let objectId;
    
    try {
      objectId = new ObjectId(id);
    } catch {
      return undefined;
    }

    const doc = await collection.findOne({ _id: objectId });
    
    if (!doc) return undefined;

    return {
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      onlinePayment: doc.onlinePayment || "0",
      createdBy: doc.createdBy,
      createdByUsername: doc.createdByUsername,
      createdAt: doc.createdAt,
    };
  }

  async getReportsByDate(date: string): Promise<Report[]> {
    const collection = await this.getCollection();
    if (!collection) {
      return [];
    }
    
    const docs = await collection.find({ date }).sort({ createdAt: -1 }).toArray();
    
    return docs.map((doc: any) => ({
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      onlinePayment: doc.onlinePayment || "0",
      createdBy: doc.createdBy,
      createdByUsername: doc.createdByUsername,
      createdAt: doc.createdAt,
    }));
  }

  async deleteReport(id: string): Promise<{ success: boolean }> {
    const collection = await this.getCollection();
    if (!collection) {
      throw new Error('Database not available - please set MONGODB_URI');
    }
    
    let objectId;
    
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new Error('Invalid report ID');
    }

    const result = await collection.deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      throw new Error('Report not found');
    }

    return { success: true };
  }

  async updateReport(id: string, reportData: any): Promise<{ success: boolean }> {
    const collection = await this.getCollection();
    if (!collection) {
      throw new Error('Database not available - please set MONGODB_URI');
    }
    
    let objectId;
    
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new Error('Invalid report ID');
    }

    const updateFields: any = {};
    if (reportData.date) updateFields.date = reportData.date;
    if (reportData.services) updateFields.services = reportData.services;
    if (reportData.expenses) updateFields.expenses = reportData.expenses;
    if (reportData.totalServices !== undefined) updateFields.totalServices = reportData.totalServices;
    if (reportData.totalExpenses !== undefined) updateFields.totalExpenses = reportData.totalExpenses;
    if (reportData.netProfit !== undefined) updateFields.netProfit = reportData.netProfit;

    const result = await collection.updateOne(
      { _id: objectId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      throw new Error('Report not found');
    }

    return { success: true };
  }
}

export const mongoStorage = new MongoStorage();
