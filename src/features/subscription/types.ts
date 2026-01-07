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
    features: ["6 vidéos", "Formats 9:16", "Durée vidéo : 8 secondes", "Watermark QuickQuick"],
    stripePriceId: "",
  },
  starter: {
    name: "Starter",
    price: 29,
    videoLimit: 20,
    features: ["20 vidéos par mois*", "Durée vidéo au choix : 8sec, 16sec, 24sec", "Formats vidéo au choix : 9:16 ou 16:9"],
    stripePriceId: "price_1SmJs7BlI68zgCmzFk7Iv8BO",
  },
  pro: {
    name: "Pro",
    price: 79,
    videoLimit: 60,
    features: ["60 vidéos par mois", "Brand Kit", "Multi-utilisateur", "Support email"],
    stripePriceId: "price_1SmJowBlI68zgCmziOqmGmKv",
    isPopular: true,
    includesPrevious: "Tout de Starter +",
  },
  business: {
    name: "Business",
    price: 199,
    videoLimit: "unlimited",
    features: ["Vidéo illimitées**", "Formation équipe", "Support dédié"],
    stripePriceId: "price_1SSey5BlI68zgCmz8gi0Dijy",
    includesPrevious: "Tout de Pro +",
  },
};
