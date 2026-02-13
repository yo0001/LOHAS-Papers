import { authenticatedProxy, executeTrialSearch } from "@/lib/api-proxy";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies, headers } from "next/headers";

// Allow up to 60s for LLM + PubMed/S2 API calls
export const maxDuration = 60;

const TRIAL_COOKIE = "lohas_trial";
const TRIAL_IP_MAX = 3;
const TRIAL_IP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(request: Request) {
  // 1. Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated user → existing flow with credit deduction
  if (user) {
    const body = await request.text();
    return authenticatedProxy("search", "/search", {
      method: "POST",
      body,
    });
  }

  // 2. Unauthenticated — trial logic
  const cookieStore = await cookies();
  const trialUsed = cookieStore.get(TRIAL_COOKIE);

  if (trialUsed) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // IP-based rate limit to prevent cookie-clearing abuse
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown";

  const rateCheck = checkRateLimit(
    `trial:${ip}`,
    TRIAL_IP_MAX,
    TRIAL_IP_WINDOW_MS,
  );

  if (!rateCheck.allowed) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // 3. Execute trial search — call backend directly (no credit deduction)
  try {
    const body = await request.text();
    const data = await executeTrialSearch(body);

    // Build response with trial flag and set cookie
    const response = Response.json({ ...data, is_trial: true });

    // Set HTTP-only cookie to mark trial as used (1 year)
    response.headers.set(
      "Set-Cookie",
      `${TRIAL_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
    );

    return response;
  } catch (err) {
    console.error("Trial search failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Backend error" },
      { status: 500 },
    );
  }
}
