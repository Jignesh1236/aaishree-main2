import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const shortcuts = [
    { key: 'Ctrl + ?', description: 'Show keyboard shortcuts' },
    { key: 'Ctrl + S', description: 'Save current report' },
    { key: 'Ctrl + N', description: 'Add new service' },
    { key: 'Ctrl + E', description: 'Add new expense' },
    { key: 'Ctrl + P', description: 'Print report' },
    { key: 'Ctrl + H', description: 'Go to history' },
    { key: 'Escape', description: 'Close dialogs' },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Keyboard className="h-4 w-4" />
        Shortcuts
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to work faster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="px-3 py-1 text-xs font-semibold bg-muted rounded">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
