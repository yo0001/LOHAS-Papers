import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    return Response.json({ error: "No active subscription" }, { status: 404 });
  }

  const origin = request.headers.get("origin") || "";
  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/account`,
  });

  return Response.json({ url: session.url });
}
