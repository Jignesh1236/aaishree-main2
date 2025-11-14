import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bookmark, Trash2, Plus } from "lucide-react";
import type { ServiceItem, ExpenseItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  services: ServiceItem[];
  expenses: ExpenseItem[];
  createdAt: string;
}

interface TemplateManagerProps {
  onLoadTemplate: (services: ServiceItem[], expenses: ExpenseItem[]) => void;
  currentServices: ServiceItem[];
  currentExpenses: ExpenseItem[];
}

export default function TemplateManager({
  onLoadTemplate,
  currentServices,
  currentExpenses,
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem("adsc-templates");
    if (saved) {
      try {
        setTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load templates:", e);
      }
    }
  }, []);

  const saveTemplates = (newTemplates: Template[]) => {
    localStorage.setItem("adsc-templates", JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a template name.",
        variant: "destructive",
      });
      return;
    }

    if (currentServices.length === 0 && currentExpenses.length === 0) {
      toast({
        title: "No Data",
        description: "Please add at least one service or expense to save a template.",
        variant: "destructive",
      });
      return;
    }

    const newTemplate: Template = {
      id: Date.now().toString(),
      name: templateName,
      services: currentServices,
      expenses: currentExpenses,
      createdAt: new Date().toISOString(),
    };

    saveTemplates([...templates, newTemplate]);
    setTemplateName("");
    setShowDialog(false);

    toast({
      title: "Template Saved",
      description: `Template "${templateName}" has been saved successfully.`,
    });
  };

  const handleLoadTemplate = (template: Template) => {
    onLoadTemplate(template.services, template.expenses);
    toast({
      title: "Template Loaded",
      description: `Loaded template "${template.name}".`,
    });
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    toast({
      title: "Template Deleted",
      description: "Template has been removed.",
    });
  };

  return (
    <Card className="shadow-lg border-0 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Save and load report templates</CardDescription>
            </div>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Save Current
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Template</DialogTitle>
                <DialogDescription>
                  Save current services and expenses as a template for quick reuse.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Weekly Services"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveTemplate();
                    }
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>Save Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No templates saved yet</p>
            <p className="text-xs mt-1">Save your current data to create a template</p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.services.length} services, {template.expenses.length} expenses
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
