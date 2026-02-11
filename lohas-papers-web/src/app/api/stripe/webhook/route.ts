import { getStripe, PRICE_MAP, type PlanKey } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan as PlanKey | undefined;
      const credits = Number(session.metadata?.credits || 0);

      if (!userId || !plan || !credits) break;

      // Idempotency: check if already processed
      const { data: existing } = await admin
        .from("purchases")
        .select("id")
        .eq("stripe_checkout_session_id", session.id)
        .single();

      if (existing) break;

      // Record purchase
      await admin.from("purchases").insert({
        user_id: userId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        plan,
        credits_granted: credits,
        amount_jpy: PRICE_MAP[plan].amount,
        status: "completed",
      });

      // Add credits
      await admin.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits,
        p_type: "purchase",
        p_description: `${plan} plan purchase`,
        p_reference_id: session.id,
      });

      // If subscription, also record subscription info
      if (session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        );
        const item = sub.items.data[0];
        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id:
              typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            plan,
            status: sub.status,
            monthly_credits: credits,
            current_period_start: new Date(
              item.current_period_start * 1000,
            ).toISOString(),
            current_period_end: new Date(
              item.current_period_end * 1000,
            ).toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const invoiceSub = invoice.parent?.subscription_details?.subscription;
      // Only process recurring (not the first payment which is handled above)
      if (
        invoice.billing_reason !== "subscription_cycle" ||
        !invoiceSub
      ) {
        break;
      }

      const subId =
        typeof invoiceSub === "string"
          ? invoiceSub
          : invoiceSub.id;

      const { data: subRecord } = await admin
        .from("subscriptions")
        .select("user_id, plan, monthly_credits")
        .eq("stripe_subscription_id", subId)
        .single();

      if (!subRecord) break;

      // Idempotency check
      const { data: existingTx } = await admin
        .from("credit_transactions")
        .select("id")
        .eq("reference_id", invoice.id)
        .single();

      if (existingTx) break;

      await admin.rpc("add_credits", {
        p_user_id: subRecord.user_id,
        p_amount: subRecord.monthly_credits,
        p_type: "subscription_renewal",
        p_description: `Monthly credits: ${subRecord.plan}`,
        p_reference_id: invoice.id,
      });

      // Update subscription period
      const sub = await getStripe().subscriptions.retrieve(subId);
      const item = sub.items.data[0];
      await admin
        .from("subscriptions")
        .update({
          status: sub.status,
          current_period_start: new Date(
            item.current_period_start * 1000,
          ).toISOString(),
          current_period_end: new Date(
            item.current_period_end * 1000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subId);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await admin
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
  }

  return Response.json({ received: true });
}
