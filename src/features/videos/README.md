# Feature Videos

Génération automatique de vidéos marketing pour Instagram Reels via l'API Kie.ai.

## Architecture

### Table Database : `videos`
- Lien avec `image_id` (l'image source)
- Métadonnées : `mode`, `prompt`, `aspect_ratio`, `status`
- URLs : `video_url`, `thumbnail_url`
- Tracking : `created_at`, `updated_at`

### Workflow
1. User sélectionne une image
2. Configure les paramètres de génération
3. Appelle Edge Function `generate-video`
4. Kie.ai génère la vidéo
5. Stockage de la vidéo + metadata en DB

## Composants

### `VideoConfigForm`
Formulaire de configuration pour la génération de vidéo.

**Structure :**
```
1. Mode de génération (packshot / situation / témoignage)
2. Prompt (textarea)
3. [Collapsible] Options avancées
   └─ Format vidéo (9:16 / 16:9)
4. Bouton "Générer une vidéo"
```

**Comportement Formats :**
- **Défaut : 9:16** (format Instagram Reels)
- **Option avancée : 16:9** (disponible dans le collapsible)
- **Aucune restriction** entre mode et aspect ratio
- **Conversion automatique** : Si le format n'est pas supporté nativement par Kie.ai, une conversion sera appliquée automatiquement (à implémenter)

**Props :**
- `onGenerate: (config) => void` - Callback avec config complète
- `disabled?: boolean` - Désactiver le formulaire
- `loading?: boolean` - État de chargement

### `VideoList`
Liste des vidéos générées pour une image.

**Features :**
- Affichage chronologique (plus récent en premier)
- Preview avec thumbnail
- Statuts : `pending`, `processing`, `completed`, `failed`
- Actions : Téléchargement, partage

## Hooks

### `useVideos`
Gestion des vidéos d'une équipe/image.

**Retour :**
```typescript
{
  videos: Video[];
  loading: boolean;
  error: Error | null;
  refetchVideos: () => Promise<void>;
}
```

## Types

### `VideoMode`
```typescript
type VideoMode = 'packshot' | 'situation' | 'temoignage';
```

**Descriptions :**
- `packshot` : Produit seul, fond neutre, rotation/zoom
- `situation` : Produit en contexte d'utilisation réel
- `temoignage` : Style user-generated content, authentique

### `AspectRatio`
```typescript
type AspectRatio = '9:16' | '16:9';
```

**Usage :**
- `9:16` : Vertical, Instagram Reels, TikTok, Stories (DÉFAUT)
- `16:9` : Horizontal, YouTube Shorts, Facebook

### `Video`
```typescript
interface Video {
  id: string;
  image_id: string;
  video_url: string;
  thumbnail_url?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mode: VideoMode;
  prompt?: string;
  aspect_ratio: AspectRatio;
  created_at: string;
  updated_at: string;
}
```

## Edge Functions

### `generate-video`
Génère une vidéo via Kie.ai.

**Input :**
```typescript
{
  imageId: string;
  mode: VideoMode;
  prompt: string;
  aspectRatio: AspectRatio;
}
```

**Process :**
1. Récupération de l'image depuis Supabase Storage
2. Appel API Kie.ai avec paramètres
3. Polling du statut de génération
4. Stockage de la vidéo générée
5. Création metadata dans table `videos`

**Output :**
```typescript
{
  videoId: string;
  status: 'pending' | 'processing';
  estimatedTime: number; // en secondes
}
```

## Gestion des Formats (Roadmap)

### Conversion Automatique
Quand Kie.ai ne supporte pas nativement le format demandé :

1. **Pre-processing image** : Conversion via Cloudinary Transform API
2. **Post-processing vidéo** : Conversion via Cloudinary Video API

**Colonnes DB pour tracking :**
- `original_aspect_ratio` : Format d'origine
- `was_converted` : Boolean si conversion appliquée
- `conversion_method` : `'crop'`, `'pad'`, `'stretch'`, `'native'`

## Tests

### Unit Tests
- `VideoConfigForm.test.tsx` : Formulaire, options avancées, pas de restrictions
- `VideoList.test.tsx` : Affichage, statuts, actions
- `useVideos.test.ts` : Hook logic, fetch, refresh

### E2E Tests
- Sélection d'image + configuration + génération
- Vérification du statut `processing` → `completed`
- Téléchargement de la vidéo générée

## Sécurité & Quotas

### Vérification Quota
Avant chaque génération, vérification du quota restant via `user_subscriptions` :
- Free : 6 vidéos/mois
- Pro : 50 vidéos/mois
- Business : Unlimited

### RLS Policies
- Les vidéos sont liées aux images via `image_id`
- Les RLS policies des images s'appliquent transitively
- Seuls les team members peuvent voir/générer des vidéos

## Usage

```tsx
import { VideoConfigForm, VideoList, useVideos } from '@/features/videos';

function VideoPanel({ selectedImage }: { selectedImage: Image }) {
  const { videos, loading, refetchVideos } = useVideos(selectedImage.id);

  const handleGenerate = async (config) => {
    await fetch('/functions/v1/generate-video', {
      method: 'POST',
      body: JSON.stringify({
        imageId: selectedImage.id,
        ...config
      })
    });
    
    refetchVideos();
  };

  return (
    <div>
      <VideoConfigForm onGenerate={handleGenerate} />
      <VideoList videos={videos} loading={loading} />
    </div>
  );
}
```

## Intégration API Kie.ai

### Authentification
Via secret `KIE_API_KEY` stocké dans Supabase Secrets.

### Endpoints
- `POST /generate` : Créer une génération
- `GET /status/{id}` : Vérifier le statut
- `GET /download/{id}` : Télécharger la vidéo

### Rate Limits
- 10 générations simultanées max
- Timeout : 5 minutes par vidéo

## Coûts Estimés

- **Kie.ai** : ~$0.05 par vidéo générée
- **Cloudinary** (conversions futures) : Free tier = 25 crédits/mois
- **Supabase Storage** : Free tier = 1GB

Pour 100 vidéos/mois : ~$5-10 en coûts API.
