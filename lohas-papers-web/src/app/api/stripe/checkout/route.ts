import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICE_MAP, ONE_TIME_PLANS, type PlanKey } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import type Stripe from "stripe";

// Generic error — never expose Stripe error details to the client
const GENERIC_ERROR = {
  error: "Payment processing is temporarily unavailable. Please try again later.",
};

export async function POST(request: Request) {
  // --- IP-based rate limit: 10 checkout attempts per IP per hour ---
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const ipLimit = checkRateLimit(`checkout:ip:${ip}`, 10, 3600_000);
  if (!ipLimit.allowed) {
    return Response.json(GENERIC_ERROR, { status: 429 });
  }

  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[checkout] Auth failed:", authError?.message || "no user");
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // --- Per-user rate limit: 5 checkout attempts per user per hour ---
  const userLimit = checkRateLimit(`checkout:user:${user.id}`, 5, 3600_000);
  if (!userLimit.allowed) {
    return Response.json(GENERIC_ERROR, { status: 429 });
  }

  // --- Validate plan ---
  let plan: string;
  try {
    const body = await request.json();
    plan = body.plan;
  } catch {
    return Response.json(GENERIC_ERROR, { status: 400 });
  }

  if (!(plan in PRICE_MAP)) {
    return Response.json(GENERIC_ERROR, { status: 400 });
  }

  const planKey = plan as PlanKey;
  const planInfo = PRICE_MAP[planKey];
  const isOneTime = ONE_TIME_PLANS.includes(planKey);
  // Build base URL reliably — origin header may be absent in some contexts
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = origin || (host ? `${proto}://${host}` : "https://lohas-papers.com");

  console.log("[checkout] origin:", origin, "host:", host, "baseUrl:", baseUrl);

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      customer_email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        plan: planKey,
        credits: String(planInfo.credits),
      },
      line_items: [{ price: planInfo.priceId, quantity: 1 }],
      mode: isOneTime ? "payment" : "subscription",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
    };

    // Note: Stripe Checkout handles 3D Secure automatically when required
    // by the card issuer. No need to explicitly request it.

    const stripe = getStripe();
    console.log("[checkout] Creating session for plan:", planKey, "priceId:", planInfo.priceId, "mode:", params.mode);
    const session = await stripe.checkout.sessions.create(params);
    console.log("[checkout] Session created:", session.id, "url:", session.url ? "OK" : "MISSING");
    return Response.json({ url: session.url });
  } catch (err) {
    // Log error details for debugging, but never expose to client
    console.error("[checkout] Stripe error:", err instanceof Error ? err.message : err);
    return Response.json(GENERIC_ERROR, { status: 500 });
  }
}
