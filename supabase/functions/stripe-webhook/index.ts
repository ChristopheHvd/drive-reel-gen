import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Mapping des priceId vers les plans
const PRICE_TO_PLAN: Record<string, { planType: string; videoLimit: number }> = {
  'price_1SmJs7BlI68zgCmzFk7Iv8BO': { planType: 'starter', videoLimit: 20 },
  'price_1SmJowBlI68zgCmziOqmGmKv': { planType: 'pro', videoLimit: 60 },
  'price_1SSey5BlI68zgCmz8gi0Dijy': { planType: 'business', videoLimit: 9999 }, // "illimité"
};

/**
 * Récupère les infos du plan à partir du priceId
 */
const getPlanFromPriceId = (priceId: string): { planType: string; videoLimit: number } => {
  return PRICE_TO_PLAN[priceId] || { planType: 'pro', videoLimit: 60 };
};

/**
 * Convertit un timestamp Unix Stripe en ISO string de manière sécurisée
 * @param timestamp - Timestamp Unix en secondes (peut être undefined/null)
 * @returns ISO string ou null si invalide
 */
const safeTimestampToISO = (timestamp: number | undefined | null): string | null => {
  if (timestamp === undefined || timestamp === null || isNaN(timestamp)) {
    return null;
  }
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    console.log("Webhook received, validating signature...");
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }
    
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log(`Webhook validated: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        
        if (!userId) {
          console.error("No user_id in session metadata");
          break;
        }

        if (!session.subscription) {
          console.error("No subscription in session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        console.log("Subscription data:", {
          id: subscription.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
        });

        if (!subscription.items.data[0]?.price?.id) {
          console.error("No price found in subscription items");
          break;
        }

        const priceId = subscription.items.data[0].price.id;
        
        // Determine plan type and video limit based on price
        const planInfo = getPlanFromPriceId(priceId);
        
        // Update subscription in database
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_type: planInfo.planType,
            video_limit: planInfo.videoLimit,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_price_id: priceId,
            current_period_start: safeTimestampToISO(subscription.current_period_start),
            current_period_end: safeTimestampToISO(subscription.current_period_end),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (error) {
          console.error("Error updating subscription:", error);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log("Updating subscription:", {
          id: subscription.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
        });
        
        // Récupérer le nouveau priceId pour détecter un changement de plan
        const priceId = subscription.items.data[0]?.price?.id;
        const planInfo = priceId ? getPlanFromPriceId(priceId) : null;
        
        const updateData: Record<string, any> = {
          current_period_start: safeTimestampToISO(subscription.current_period_start),
          current_period_end: safeTimestampToISO(subscription.current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        };
        
        // Si le plan a changé, mettre à jour le type et la limite
        if (planInfo && priceId) {
          updateData.plan_type = planInfo.planType;
          updateData.video_limit = planInfo.videoLimit;
          updateData.stripe_price_id = priceId;
        }
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error("Error updating subscription:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_type: 'free',
            video_limit: 6,
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_start: null,
            current_period_end: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error("Error resetting subscription:", error);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Ne traiter que les factures liées à un abonnement
        if (!invoice.subscription) {
          console.log("Invoice not linked to a subscription, skipping");
          break;
        }

        console.log("Processing invoice.paid for subscription:", invoice.subscription);

        // Récupérer les détails de l'abonnement pour les dates de période
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );

        console.log("Resetting quota for subscription:", {
          id: subscription.id,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
        });

        // Réinitialiser le compteur de vidéos et mettre à jour les dates de période
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            videos_generated_this_month: 0,
            current_period_start: safeTimestampToISO(subscription.current_period_start),
            current_period_end: safeTimestampToISO(subscription.current_period_end),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error("Error resetting quota:", error);
        } else {
          console.log("Successfully reset videos_generated_this_month to 0");
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
