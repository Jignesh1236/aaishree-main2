import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ArrowLeft, FileText, User, Trash2, Edit, LogIn, LogOut, Download, Share, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";

interface ActivityLog {
  _id: string;
  userId: string;
  username: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export default function ActivityLogs() {
  const { user } = useAuth();
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['/api/activity-logs'],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === "admin",
  });

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    if (filterUser !== "all") {
      filtered = filtered.filter(log => log.userId === filterUser);
    }

    if (filterAction !== "all") {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    return filtered;
  }, [logs, filterUser, filterAction]);

  const getActionIcon = (action: string) => {
    const icons: Record<string, any> = {
      login: LogIn,
      logout: LogOut,
      report_created: FileText,
      report_updated: Edit,
      report_deleted: Trash2,
      report_viewed: Eye,
      report_exported: Download,
      report_shared: Share,
      user_created: User,
      user_updated: Edit,
      user_deleted: Trash2,
    };
    
    const Icon = icons[action] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      login: "default",
      logout: "secondary",
      report_created: "default",
      report_updated: "secondary",
      report_deleted: "destructive",
      report_viewed: "outline",
      report_exported: "secondary",
      report_shared: "default",
      user_created: "default",
      user_updated: "secondary",
      user_deleted: "destructive",
    };
    
    return (
      <Badge variant={variants[action] || "outline"}>
        {action.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
              <p className="text-muted-foreground">Monitor user activity and system events</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Showing {filteredLogs.length} of {logs.length} activities</CardDescription>
                </div>
                <div className="flex gap-2">
                  {user.role === "admin" && (
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={filterAction} onValueChange={setFilterAction}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="report_created">Report Created</SelectItem>
                      <SelectItem value="report_updated">Report Updated</SelectItem>
                      <SelectItem value="report_deleted">Report Deleted</SelectItem>
                      <SelectItem value="report_viewed">Report Viewed</SelectItem>
                      <SelectItem value="report_exported">Report Exported</SelectItem>
                      <SelectItem value="report_shared">Report Shared</SelectItem>
                      {user.role === "admin" && (
                        <>
                          <SelectItem value="user_created">User Created</SelectItem>
                          <SelectItem value="user_updated">User Updated</SelectItem>
                          <SelectItem value="user_deleted">User Deleted</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading activity logs...</p>
              ) : filteredLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No activity logs found</p>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <Card key={log._id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 rounded-full bg-primary/10 text-primary">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <span className="text-sm font-medium">{log.username}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span>
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                              {log.resourceType && log.resourceId && (
                                <span>
                                  {log.resourceType}: {log.resourceId.substring(0, 8)}...
                                </span>
                              )}
                              {log.ipAddress && (
                                <span>IP: {log.ipAddress}</span>
                              )}
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
