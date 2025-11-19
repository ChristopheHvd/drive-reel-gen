import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Folder, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DriveFolderItem {
  id: string;
  name: string;
}

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface DriveFolderBrowserProps {
  onFolderSelected: (folderId: string, folderName: string) => void;
}

export const DriveFolderBrowser = ({ onFolderSelected }: DriveFolderBrowserProps) => {
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'Mon Drive' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFolders(currentFolderId);
  }, [currentFolderId]);

  const loadFolders = async (folderId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-drive-folders', {
        body: { parentFolderId: folderId }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors du chargement des dossiers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: DriveFolderItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumb([...breadcrumb, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    const folderId = newBreadcrumb[newBreadcrumb.length - 1].id;
    setCurrentFolderId(folderId);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Sélectionner un dossier</h3>
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {breadcrumb.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className="hover:text-foreground transition-colors"
              >
                {item.name}
              </button>
              {index < breadcrumb.length - 1 && (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Folders List */}
      <ScrollArea className="h-[400px] rounded-md border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : folders.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Aucun dossier trouvé
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
              >
                <button
                  onClick={() => handleFolderClick(folder)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <Folder className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{folder.name}</span>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFolderSelected(folder.id, folder.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Sélectionner
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Select Current Folder Button */}
      <div className="flex justify-between items-center pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          ou sélectionner le dossier actuel :
        </p>
        <Button
          variant="premium"
          onClick={() => {
            const currentFolder = breadcrumb[breadcrumb.length - 1];
            onFolderSelected(currentFolder.id, currentFolder.name);
          }}
        >
          Sélectionner "{breadcrumb[breadcrumb.length - 1].name}"
        </Button>
      </div>
    </Card>
  );
};
