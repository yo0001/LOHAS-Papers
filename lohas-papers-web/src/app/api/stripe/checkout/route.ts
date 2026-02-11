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
  const origin = request.headers.get("origin") || "";

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
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
    };

    // --- EMV 3-D Secure: always request 3DS authentication ---
    if (isOneTime) {
      params.payment_intent_data = {
        payment_method_options: {
          card: {
            request_three_d_secure: "any",
          },
        },
      };
    } else {
      params.subscription_data = {
        payment_settings: {
          payment_method_options: {
            card: {
              request_three_d_secure: "any" as "any",
            },
          },
        },
      };
    }

    const session = await getStripe().checkout.sessions.create(params);
    return Response.json({ url: session.url });
  } catch {
    // Never expose Stripe error details to the client
    return Response.json(GENERIC_ERROR, { status: 500 });
  }
}
