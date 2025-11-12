import type { Report, InsertReport } from "@shared/schema";
import { mongoStorage } from "./mongodb";

export interface IStorage {
  createReport(report: InsertReport): Promise<Report>;
  getReports(): Promise<Report[]>;
  getReportById(id: string): Promise<Report | undefined>;
  getReportByDate(date: string): Promise<Report | undefined>;
  deleteReport(id: string): Promise<void>;
  updateReport(id: string, reportData: any): Promise<{ success: boolean }>;
}

export const storage = mongoStorage;