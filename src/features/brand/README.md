# Feature: Brand

## Vue d'ensemble
Gère le profil de marque de l'utilisateur, incluant l'analyse automatique du site web via IA.

## Composants Publics
- **`BrandSettingsDialog`**: Modal de paramètres de la marque
- **`BrandForm`**: Formulaire de saisie des infos de marque (usage interne)
- **`BrandAnalysisButton`**: Bouton d'analyse IA (usage interne)

## Hooks Publics
- **`useBrandProfile`**: Charger/mettre à jour le profil de marque
- **`useBrandAnalysis`**: Analyser un site web avec IA

## Types
- **`BrandProfile`**: Interface du profil de marque complet
- **`BrandFormData`**: Données du formulaire
- **`CreateBrandDto`**: DTO pour création
- **`UpdateBrandDto`**: DTO pour mise à jour

## Edge Functions
- **`analyze-brand`**: Analyse le site web via Lovable AI (Gemini 2.5 Pro)

## Dépendances
- Lovable AI (Gemini 2.5 Pro)
- Supabase (table: brand_profiles)
- React Hook Form + Zod pour validation

## Utilisation

```tsx
import { BrandSettingsDialog, useBrandProfile } from '@/features/brand';

// Dans un composant
const MyComponent = () => {
  const { profile, loading } = useBrandProfile();
  
  return (
    <div>
      <BrandSettingsDialog trigger={<Button>Paramètres</Button>} />
      {profile && <p>{profile.company_name}</p>}
    </div>
  );
};
```
