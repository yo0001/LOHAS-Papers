import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_COSTS, type CreditOperation } from "@/lib/credit-costs";

const FASTAPI_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";

export async function authenticatedProxy(
  operation: CreditOperation,
  fastApiPath: string,
  fetchOptions?: RequestInit,
  referenceId?: string,
) {
  // 1. Verify auth
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  // 2. Deduct credits (atomic)
  const admin = createAdminClient();
  const cost = CREDIT_COSTS[operation];

  const { data, error: creditError } = await admin.rpc("deduct_credits", {
    p_user_id: user.id,
    p_amount: cost,
    p_type: operation,
    p_description: `${operation}: ${fastApiPath}`,
    p_reference_id: referenceId,
  });

  if (creditError) {
    if (creditError.message.includes("Insufficient credits")) {
      return Response.json(
        { error: "Insufficient credits", required: cost },
        { status: 402 },
      );
    }
    return Response.json({ error: "Credit deduction failed" }, { status: 500 });
  }

  // 3. Proxy to FastAPI
  try {
    const headers: Record<string, string> = {};
    if (fetchOptions?.body) {
      headers["Content-Type"] = "application/json";
    }
    if (BACKEND_API_KEY) {
      headers["X-API-Key"] = BACKEND_API_KEY;
    }

    const res = await fetch(`${FASTAPI_URL}${fastApiPath}`, {
      ...fetchOptions,
      headers,
    });

    if (!res.ok) {
      // Refund credits on FastAPI error
      await admin.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: cost,
        p_type: "refund",
        p_description: `Refund: ${operation} failed with HTTP ${res.status}`,
        p_reference_id: referenceId,
      });
      return Response.json(
        { error: `Backend error: ${res.status}` },
        { status: res.status },
      );
    }

    const body = await res.json();
    return Response.json({ ...body, credits_remaining: data });
  } catch {
    // Refund on network error
    await admin.rpc("add_credits", {
      p_user_id: user.id,
      p_amount: cost,
      p_type: "refund",
      p_description: `Refund: ${operation} network error`,
    });
    return Response.json({ error: "Backend unavailable" }, { status: 502 });
  }
}
