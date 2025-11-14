import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Report } from "@shared/schema";

export default function BackupRestore() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  const handleBackup = () => {
    try {
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        reports: reports,
        templates: localStorage.getItem("adsc-templates") || "[]",
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adsc-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Created",
        description: `Successfully backed up ${reports.length} reports.`,
      });
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "Failed to create backup file.",
        variant: "destructive",
      });
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.version || !backupData.reports) {
          throw new Error('Invalid backup file format');
        }

        if (backupData.templates) {
          localStorage.setItem("adsc-templates", backupData.templates);
        }

        toast({
          title: "Restore Initiated",
          description: `Found ${backupData.reports.length} reports in backup. Note: Report restoration requires admin access.`,
        });

        queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      } catch (error) {
        toast({
          title: "Restore Failed",
          description: "Invalid backup file or corrupted data.",
          variant: "destructive",
        });
      }
    };

    input.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Backup & Restore</CardTitle>
            <CardDescription>Export and import your data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={handleBackup} 
          variant="outline" 
          className="w-full gap-2"
        >
          <Download className="h-4 w-4" />
          Download Backup
        </Button>
        <Button 
          onClick={handleRestore} 
          variant="outline" 
          className="w-full gap-2"
        >
          <Upload className="h-4 w-4" />
          Restore from Backup
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Backup includes all reports and templates. Keep backups safe!
        </p>
      </CardContent>
    </Card>
  );
}
