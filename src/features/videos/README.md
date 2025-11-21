# Feature Videos

Cette feature gère la génération et l'affichage des vidéos créées à partir des images.

## Architecture

### Composants

- **VideoList** : Affiche la liste des vidéos générées pour une image sélectionnée
- **VideoConfigForm** : Formulaire de configuration pour la génération de vidéo

### Hooks

- **useVideos** : Hook pour récupérer les vidéos d'une image

### Types

```typescript
interface Video {
  id: string;
  image_id: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mode: 'packshot' | 'situation' | 'temoignage';
  prompt?: string;
  aspect_ratio: '9:16' | '16:9';
  created_at: string;
  updated_at: string;
}
```

## État de l'implémentation

### ✅ Implémenté
- Structure des composants UI
- Types TypeScript
- Formulaire de configuration
- Hooks de base

### 🚧 En cours / TODO
- Table `videos` en base de données
- Edge Function `generate-video` pour appel API Kie.ai
- Logique de génération réelle
- Polling pour statut vidéo
- Player vidéo modal

## Utilisation

```tsx
import { VideoList, VideoConfigForm, useVideos } from '@/features/videos';

function VideoPanel({ selectedImageId }) {
  const { videos, loading } = useVideos(selectedImageId);
  
  const handleGenerate = async (config) => {
    // TODO: Appeler l'edge function generate-video
  };
  
  return (
    <>
      <VideoList 
        imageId={selectedImageId}
        videos={videos}
        loading={loading}
      />
      <VideoConfigForm onGenerate={handleGenerate} />
    </>
  );
}
```

## Tests

Tests implémentés :
- ✅ `useVideos.test.ts` - Tests du hook
- ✅ `VideoList.test.tsx` - Tests du composant liste
- ✅ `VideoConfigForm.test.tsx` - Tests du formulaire
- ✅ `e2e/dashboard-layout.spec.ts` - Tests E2E du layout

Pour exécuter les tests :
```bash
npm run test:unit      # Tests unitaires
npm run test:e2e       # Tests E2E
```

## Sécurité

### RLS Policies (à implémenter)

```sql
-- SELECT: Users can view videos from their team
CREATE POLICY "Users can view team videos"
ON videos FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT user_teams())
);

-- INSERT: Users can create videos for their team
CREATE POLICY "Users can create team videos"
ON videos FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT user_teams())
);
```

## Prochaines étapes

1. Créer la table `videos` avec migrations
2. Implémenter l'edge function `generate-video`
3. Connecter l'API Kie.ai
4. Ajouter le polling pour le statut
5. Créer le player vidéo modal
