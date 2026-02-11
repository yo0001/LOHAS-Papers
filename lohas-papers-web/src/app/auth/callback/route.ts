import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // --- Rate limit: 10 login attempts per IP per 15 minutes ---
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(`auth:ip:${ip}`, 10, 900_000);
  if (!limit.allowed) {
    // Redirect to home silently — don't reveal rate limit details
    return NextResponse.redirect(`${origin}/`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // --- Audit log: record login event ---
      const userAgent = request.headers.get("user-agent") || "";
      try {
        const admin = createAdminClient();
        await admin.from("login_events").insert({
          user_id: data.user.id,
          email: data.user.email,
          ip_address: ip,
          user_agent: userAgent.slice(0, 500),
          event_type: "login",
        });
      } catch {
        // Don't block login if audit logging fails
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
