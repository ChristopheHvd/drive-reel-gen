import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapping des plans vers les priceId
const PLAN_PRICES: Record<string, string> = {
  'starter': 'price_1SmJs7BlI68zgCmzFk7Iv8BO',
  'pro': 'price_1SmJowBlI68zgCmziOqmGmKv',
  'business': 'price_1SSey5BlI68zgCmz8gi0Dijy',
};

// Hiérarchie des plans (pour déterminer upgrade/downgrade)
const PLAN_HIERARCHY = ['free', 'starter', 'pro', 'business'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { newPlanType } = await req.json();
    
    if (!newPlanType || !PLAN_PRICES[newPlanType]) {
      throw new Error("Invalid plan type. Must be 'starter', 'pro', or 'business'");
    }

    console.log(`User ${user.email} requesting change to ${newPlanType}`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Trouver le client Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please subscribe first.");
    }

    const customerId = customers.data[0].id;

    // Trouver l'abonnement actif
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found. Please subscribe first.");
    }

    const subscription = subscriptions.data[0];
    const currentPriceId = subscription.items.data[0].price.id;
    const newPriceId = PLAN_PRICES[newPlanType];

    // Déterminer si c'est un upgrade ou downgrade
    const currentPlanIndex = PLAN_HIERARCHY.findIndex(p => 
      Object.entries(PLAN_PRICES).find(([plan, price]) => price === currentPriceId)?.[0] === p
    );
    const newPlanIndex = PLAN_HIERARCHY.indexOf(newPlanType);
    const isDowngrade = newPlanIndex < currentPlanIndex;

    console.log(`Change type: ${isDowngrade ? 'DOWNGRADE' : 'UPGRADE'} from index ${currentPlanIndex} to ${newPlanIndex}`);

    // Mettre à jour l'abonnement
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      // Pour downgrade: le changement prend effet au prochain renouvellement
      // Pour upgrade: facturation immédiate au prorata
      proration_behavior: isDowngrade ? 'none' : 'create_prorations',
    });

    console.log(`Subscription updated: ${updatedSubscription.id}`);

    return new Response(JSON.stringify({ 
      success: true,
      isDowngrade,
      newPlan: newPlanType,
      effectiveDate: isDowngrade 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
