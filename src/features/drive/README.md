# Feature: Drive

## Vue d'ensemble
Gère l'intégration avec Google Drive pour synchroniser automatiquement les images de l'utilisateur.

## Composants Publics
- **`GoogleDrivePicker`**: Modal pour sélectionner un dossier Google Drive

## Hooks Publics
- **`useDriveImages`**: Charger et gérer les images synchronisées
- **`useDriveFolders`**: Gérer les dossiers Google Drive connectés
- **`useDriveSync`**: Synchroniser les images depuis Google Drive

## Types
- **`DriveImage`**: Interface d'une image synchronisée
- **`DriveFolder`**: Interface d'un dossier connecté
- **`ConnectFolderDto`**: DTO pour connecter un dossier
- **`SyncDriveResponse`**: Réponse de synchronisation

## Edge Functions
- **`sync-google-drive`**: Synchronise les images depuis Google Drive

## Dépendances
- Google Drive API (OAuth2)
- Supabase (tables: drive_folders, drive_images, drive_tokens)
- Supabase Storage pour les images téléchargées

## Utilisation

```tsx
import { GoogleDrivePicker, useDriveImages, useDriveFolders } from '@/features/drive';

const MyComponent = () => {
  const { images, loading } = useDriveImages();
  const { folder, connectFolder } = useDriveFolders();
  const [pickerOpen, setPickerOpen] = useState(false);
  
  const handleFolderSelect = async (folderId: string, folderName: string) => {
    await connectFolder({ folderId, folderName });
  };
  
  return (
    <>
      <Button onClick={() => setPickerOpen(true)}>Connecter Drive</Button>
      <GoogleDrivePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onFolderSelected={handleFolderSelect}
      />
      {images.map(img => <img key={img.id} src={img.thumbnail_link} />)}
    </>
  );
};
```
