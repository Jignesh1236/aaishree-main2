
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { Report, InsertReport } from '@shared/schema';
import type { IStorage } from './storage';

let client: MongoClient | null = null;
let db: Db | null = null;

async function connectToMongoDB(): Promise<Db | null> {
  if (db) return db;

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.warn('⚠️  MONGODB_URI not set - storage features will be limited');
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
    
    console.log('✅ Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed - app will run with limited features');
    console.warn('Error details:', error instanceof Error ? error.message : error);
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
    
    await this.collection.createIndex({ date: 1 }, { unique: true });
    
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

    return reports.map(doc => ({
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
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
      createdAt: doc.createdAt,
    };
  }

  async getReportByDate(date: string): Promise<Report | undefined> {
    const collection = await this.getCollection();
    if (!collection) {
      return undefined;
    }
    
    const doc = await collection.findOne({ date });
    
    if (!doc) return undefined;

    return {
      id: doc._id.toString(),
      date: doc.date,
      services: doc.services,
      expenses: doc.expenses,
      totalServices: doc.totalServices,
      totalExpenses: doc.totalExpenses,
      netProfit: doc.netProfit,
      createdAt: doc.createdAt,
    };
  }

  async deleteReport(id: string): Promise<void> {
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

    await collection.deleteOne({ _id: objectId });
  }
}

export const mongoStorage = new MongoStorage();
