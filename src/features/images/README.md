# Feature Images

Gestion complète des images pour les équipes : upload, affichage, suppression.

## Architecture

### Storage
- **Bucket Supabase** : `team-images`
- **Path** : `{team_id}/{uuid}.{ext}`
- **RLS** : Strict, accès limité aux membres de l'équipe

### Table Database : `images`
- Lien avec `team_id` pour multi-tenant
- Métadonnées : nom, taille, MIME type, dimensions
- Tracking : `uploaded_by` pour audit

## Composants

### `ImageUploader`
Composant d'upload avec drag'n'drop et sélection de fichiers.

**Comportement :**
- **Upload automatique** : L'upload démarre immédiatement après sélection des fichiers (pas de bouton "Uploader")
- **Drag'n'drop** : Zone de dépôt active sur tout le composant
- **Validation client** : Taille max 10MB, types MIME autorisés
- **Progress bars** : Affichage du statut d'upload pour chaque fichier
- **Multi-fichiers** : Jusqu'à 10 fichiers simultanés par défaut

**Props :**
- `onUploadComplete?: () => void` - Callback après upload réussi
- `maxFiles?: number` - Nombre max de fichiers (défaut: 10)

**États :**
- `isUploading` : Upload en cours
- `progress` : Tableau des progress par fichier (0-100%)
- Toast notifications pour succès/erreur

### `ImageGrid`
Grille responsive d'affichage des images.

**Features :**
- Lazy loading des images
- États vides / loading
- Grid responsive (mobile → desktop)

### `ImageCard`
Card individuelle pour chaque image.

**Actions :**
- Prévisualisation
- Téléchargement
- Suppression
- Sélection (pour génération vidéo)

## Hooks

### `useImageUpload`
Gère l'upload vers Storage + création metadata.

**Retour :**
```typescript
{
  uploadImages: (files: File[]) => Promise<Image[]>;
  isUploading: boolean;
  progress: UploadProgress[];
  resetProgress: () => void;
}
```

**Logique :**
1. Upload vers `team-images` bucket
2. Extraction dimensions avec `Image` API
3. Création metadata dans table `images`
4. Gestion automatique du `team_id` (depuis contexte user)

### `useImages`
CRUD operations sur les images de l'équipe.

**Retour :**
```typescript
{
  images: Image[];
  loading: boolean;
  error: Error | null;
  deleteImage: (id: string) => Promise<void>;
  fetchImages: () => Promise<void>;
}
```

## Sécurité

### RLS Policies
- **SELECT** : Team members uniquement
- **INSERT** : Team members, avec `team_id` vérifié
- **DELETE** : Team members uniquement
- **UPDATE** : Team members uniquement

### Validation
- **Client** : Taille, MIME type, nombre de fichiers
- **Server** : RLS automatique via Supabase

## Tests

### Unit Tests
- `ImageUploader.test.tsx` : Upload immédiat, drag'n'drop, validation
- `ImageCard.test.tsx` : Actions (download, delete, select)
- `useImageUpload.test.ts` : Hook logic, team_id handling
- `useImages.test.ts` : CRUD operations, RLS respect

### Integration Tests
- `tests/security/images-rls.test.ts` : Vérification RLS stricte

### E2E Tests
- `e2e/image-upload.spec.ts` : Flow complet d'upload automatique

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
        onDelete={deleteImage}
      />
    </div>
  );
}
```

## Prérequis

**IMPORTANT** : L'utilisateur doit être associé à une équipe (via `team_members`) pour pouvoir uploader des images. Sans team, l'upload échouera avec l'erreur "Équipe non trouvée".

Le système de création automatique de team lors de l'inscription doit être en place.
