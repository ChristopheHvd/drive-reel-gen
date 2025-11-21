# Feature Images

Gère l'upload, l'affichage et la suppression d'images pour les équipes.

## Architecture

### Storage
- Bucket : `team-images`
- Path : `{team_id}/{uuid}.{ext}`
- RLS : Seuls les membres de l'équipe peuvent accéder aux images de leur team

### Table `images`
- Lien vers `team_id` pour partage entre membres
- Métadonnées : nom, taille, type MIME, dimensions
- Tracking : `uploaded_by` pour audit

## Composants

### `ImageUploader`
Upload d'images avec drag'n'drop et file picker
- Validation côté client (type, taille max 10MB)
- Progress bars pendant l'upload
- Support multi-fichiers (max 10)

### `ImageGrid`
Grille responsive d'affichage des images
- Lazy loading
- États vides
- Loading skeletons

### `ImageCard`
Card individuelle pour chaque image
- Preview
- Actions : télécharger, supprimer
- Sélection (pour génération vidéo)

## Hooks

### `useImageUpload`
Gère l'upload vers Storage + création métadonnées
- Récupère automatiquement le `team_id`
- Upload vers `team-images/{team_id}/{uuid}.ext`
- Création entrée dans table `images`

### `useImages`
CRUD sur les images de l'équipe
- Fetch automatique des images de la team
- Suppression (storage + table)
- Refresh manuel

## Sécurité

- RLS strict sur table `images` : `team_id IN (SELECT user_teams())`
- RLS sur storage : path doit commencer par team_id de l'utilisateur
- Validation côté client ET serveur (taille, type MIME)

## Usage

```tsx
import { ImageUploader, ImageGrid, useImages } from '@/features/images';

function MyComponent() {
  const { images, loading, deleteImage, fetchImages } = useImages();
  
  return (
    <div>
      <ImageUploader onUploadComplete={fetchImages} />
      <ImageGrid 
        images={images} 
        loading={loading} 
        onDeleteImage={deleteImage} 
      />
    </div>
  );
}
```
