# Feature: Drive

## Vue d'ensemble
Gère l'intégration avec Google Drive pour synchroniser automatiquement les images de l'utilisateur.

## Composants Publics
- **`GoogleDrivePicker`**: Modal pour sélectionner un dossier Google Drive
- **`DriveFolderBrowser`**: Navigateur hiérarchique de dossiers Google Drive
- **`ConnectDriveButton`**: Bouton pour connecter Google Drive via OAuth dédié

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
- **`google-drive-auth`**: Gère le flow OAuth dédié pour Google Drive (`/authorize`, `/callback`, `/save-token`)
- **`list-drive-folders`**: Liste les dossiers d'un répertoire Google Drive
- **`sync-google-drive`**: Synchronise les images depuis Google Drive

## Dépendances
- Google Drive API (OAuth2)
- Supabase (tables: drive_folders, drive_images, drive_tokens)
- Supabase Storage pour les images téléchargées

## Utilisation

```tsx
import { ConnectDriveButton, DriveFolderBrowser, useDriveImages } from '@/features/drive';

const MyComponent = () => {
  const { images, loading } = useDriveImages();
  const [showBrowser, setShowBrowser] = useState(false);
  
  const handleConnected = () => {
    setShowBrowser(true);
  };
  
  const handleFolderSelect = async (folderId: string, folderName: string) => {
    console.log('Folder selected:', folderId, folderName);
  };
  
  return (
    <>
      <ConnectDriveButton onConnected={handleConnected} />
      {showBrowser && (
        <DriveFolderBrowser onFolderSelected={handleFolderSelect} />
      )}
      {images.map(img => <img key={img.id} src={img.thumbnail_link} />)}
    </>
  );
};
```
