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

## Tests

### Tests Unitaires
- `useImages.test.ts` : Tests du hook de gestion des images
- `useImageUpload.test.ts` : Tests du hook d'upload
- `ImageUploader.test.tsx` : Tests du composant d'upload
- `ImageCard.test.tsx` : Tests de la card d'affichage

### Tests d'Intégration
- `team-rls.test.ts` : Tests des RLS policies des teams
- `images-rls.test.ts` : Tests de sécurité des images

### Exécuter les tests
```bash
# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration (nécessite Supabase)
npm run test:integration

# Tous les tests
npm run test:all
```

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

## Sécurité RLS - Détails

### Table `images`
```sql
-- SELECT: User voit images de ses teams
CREATE POLICY "Team members can view team images"
ON images FOR SELECT
USING (team_id IN (SELECT public.user_teams()));

-- INSERT: User peut créer images pour ses teams
CREATE POLICY "Team members can insert team images"
ON images FOR INSERT
WITH CHECK (team_id IN (SELECT public.user_teams()));

-- UPDATE/DELETE: Idem
```

### Storage Bucket `team-images`
```sql
-- Upload: Path doit être {team_id}/...
CREATE POLICY "Team members can upload team images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-images'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_teams())
);

-- View/Delete: Idem avec validation du path
```

### Helper Function
```sql
-- Retourne les team_id des teams du user
CREATE FUNCTION public.user_teams()
RETURNS SETOF UUID
AS $$
  SELECT team_id 
  FROM public.team_members 
  WHERE user_id = auth.uid();
$$;
```

## Points d'Attention

### Upload
- Max 10MB par fichier
- Types autorisés : JPEG, JPG, PNG, WEBP, HEIC
- Génération d'UUID pour éviter les conflits

### Performances
- Lazy loading des images dans la grid
- Pagination recommandée pour > 100 images
- Utiliser les miniatures quand disponibles

### Erreurs Courantes
1. **"Team not found"** : User n'est membre d'aucune team (vérifier trigger signup)
2. **"Permission denied"** : RLS bloque l'accès (vérifier team_id)
3. **"File too large"** : Fichier > 10MB (valider côté client)
