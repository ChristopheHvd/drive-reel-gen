export interface Subscription {
  id: string;
  user_id: string;
  team_id: string | null;
  plan_type: "free" | "starter" | "pro" | "business";
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
  includesPrevious?: string;
}

export const PLAN_CONFIGS: Record<"free" | "starter" | "pro" | "business", PlanConfig> = {
  free: {
    name: "Gratuit",
    price: 0,
    videoLimit: 6,
    features: [
      "6 vidéos",
      "Format 9:16 et 16:9",
      "Support communautaire",
    ],
    stripePriceId: "",
  },
  starter: {
    name: "Starter",
    price: 29,
    videoLimit: 20,
    features: [
      "20 vidéos par mois*",
      "Brand Kit",
      "Upload illimité",
      "Tous les formats : 8sec, 16sec, 24sec",
    ],
    stripePriceId: "price_starter_placeholder",
  },
  pro: {
    name: "Pro",
    price: 79,
    videoLimit: "unlimited",
    features: [
      "Vidéos illimitées*",
      "Multi-utilisateur",
      "Support email",
    ],
    stripePriceId: "price_1SSexRBlI68zgCmz0DNoBAha",
    isPopular: true,
    includesPrevious: "Tout de Starter +",
  },
  business: {
    name: "Business",
    price: 199,
    videoLimit: "unlimited",
    features: [
      "API access",
      "Formation équipe",
      "Support dédié",
    ],
    stripePriceId: "price_1SSey5BlI68zgCmz8gi0Dijy",
    includesPrevious: "Tout de Pro +",
  },
};
