import { handleStripeWebhook } from "@/lib/services/billing-service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  try {
    await handleStripeWebhook(rawBody, signature);
    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Webhook error", { status: 400 });
  }
}
