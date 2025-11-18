import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderOpen, Loader2 } from "lucide-react";

interface GoogleDrivePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderSelected: (folderId: string, folderName: string) => void;
}

export const GoogleDrivePicker = ({ open, onOpenChange, onFolderSelected }: GoogleDrivePickerProps) => {
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId.trim() || !folderName.trim()) return;

    setIsLoading(true);
    try {
      await onFolderSelected(folderId.trim(), folderName.trim());
      onOpenChange(false);
      setFolderId("");
      setFolderName("");
    } catch (error) {
      console.error("Error selecting folder:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner un dossier Google Drive</DialogTitle>
          <DialogDescription>
            Entrez l'ID du dossier Google Drive contenant vos images
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Nom du dossier</Label>
            <Input
              id="folderName"
              placeholder="ex: Photos Marketing"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folderId">ID du dossier</Label>
            <Input
              id="folderId"
              placeholder="ex: 1a2b3c4d5e6f7g8h9i0j"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              L'ID se trouve dans l'URL du dossier : drive.google.com/drive/folders/<strong>[ID]</strong>
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" variant="premium" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Connecter
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};