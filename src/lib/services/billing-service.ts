import Stripe from "stripe";
import { getAppUrl, isStripeConfigured, STRIPE_PRICE_IDS } from "../config";
import type { Plan } from "../types";
import { getRepository } from "../repositories";

function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function createCheckoutSession(input: { userId: string; email: string; plan: Plan }) {
  const appUrl = getAppUrl();

  if (!isStripeConfigured() || input.plan === "free") {
    const repo = getRepository();
    await repo.changePlan(input.userId, input.plan);
    return {
      url: `${appUrl}/dashboard/billing?checkout=success&plan=${input.plan}`,
      mode: "demo" as const,
    };
  }

  const priceId = STRIPE_PRICE_IDS[input.plan];
  if (!priceId) throw new Error(`Stripe price not configured for ${input.plan}`);

  const stripe = stripeClient();
  const trialDays = Number(process.env.STRIPE_TRIAL_DAYS || "7");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data:
      Number.isFinite(trialDays) && trialDays > 0
        ? {
            trial_period_days: trialDays,
            metadata: { userId: input.userId, plan: input.plan },
          }
        : { metadata: { userId: input.userId, plan: input.plan } },
    success_url: `${appUrl}/dashboard/billing?checkout=success&plan=${input.plan}`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancel`,
    metadata: { userId: input.userId, plan: input.plan },
  });

  if (!session.url) throw new Error("Could not create checkout session");
  return { url: session.url, mode: "live" as const };
}

export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  if (!isStripeConfigured()) return;
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const event = stripe.webhooks.constructEvent(rawBody, signature ?? "", secret);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as Plan | undefined;
    if (userId && plan) {
      const repo = getRepository();
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      await repo.updateProfile(userId, {
        plan,
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: subscriptionId ?? null,
      });
    }
  }
}
