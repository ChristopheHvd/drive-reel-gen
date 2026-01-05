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
        let planType = 'pro';
        let videoLimit = 50;
        
        // Update subscription in database
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_type: planType,
            video_limit: videoLimit,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_price_id: priceId,
            current_period_start: safeTimestampToISO(subscription.current_period_start),
            current_period_end: safeTimestampToISO(subscription.current_period_end),
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
        });
        
        const { error } = await supabaseAdmin
          .from('user_subscriptions')
          .update({
            current_period_start: safeTimestampToISO(subscription.current_period_start),
            current_period_end: safeTimestampToISO(subscription.current_period_end),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
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
