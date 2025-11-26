export interface Subscription {
  id: string;
  user_id: string;
  team_id: string | null;
  plan_type: "free" | "pro" | "business";
  video_limit: number;
  videos_generated_this_month: number;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
}

export interface PlanConfig {
  name: string;
  price: number;
  videoLimit: number | "unlimited";
  features: string[];
  stripePriceId: string;
  isPopular?: boolean;
}

export const PLAN_CONFIGS: Record<"free" | "pro" | "business", PlanConfig> = {
  free: {
    name: "Free",
    price: 0,
    videoLimit: 6,
    features: ["6 vidéos par mois", "Génération IA de prompts", "Formats 9:16 et 16:9"],
    stripePriceId: "", // forcement vide
  },
  pro: {
    name: "Pro",
    price: 100,
    videoLimit: 50,
    features: ["50 vidéos par mois", "Génération IA de prompts", "Formats 9:16 et 16:9", "Support prioritaire"],
    stripePriceId: "price_1SSfSJBlI68zgCmzWM3uPZIu", // À remplir par l'utilisateur
    isPopular: true,
  },
  business: {
    name: "Business",
    price: 350,
    videoLimit: "unlimited",
    features: [
      "Vidéos illimitées",
      "Profil de marque intégré",
      "Formats 9:16 et 16:9",
      "Logo et images additionnelles",
      "Support dédié 24/7",
    ],
    stripePriceId: "price_1SSfSxBlI68zgCmzD8NPr8Aq", // À remplir par l'utilisateur
  },
};
