import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CREDIT_COSTS, type CreditOperation } from "@/lib/credit-costs";
import {
  handleSearch,
  handlePaperDetail,
  handleFulltext,
} from "@/lib/backend";
import { LLMServiceError } from "@/lib/backend/llm-client";
import type { SearchRequest } from "@/lib/backend/types";

/**
 * Authenticate user, deduct credits, and execute backend logic directly.
 * Previously this proxied to FastAPI on Fly.io — now it calls local TypeScript functions.
 */
export async function authenticatedProxy(
  operation: CreditOperation,
  backendPath: string,
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
    p_description: `${operation}: ${backendPath}`,
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

  // 3. Execute backend logic directly
  try {
    const result = await executeBackendLogic(operation, backendPath, fetchOptions);
    return Response.json({ ...result, credits_remaining: data });
  } catch (err) {
    // Refund credits on error
    await admin.rpc("add_credits", {
      p_user_id: user.id,
      p_amount: cost,
      p_type: "refund",
      p_description: `Refund: ${operation} failed - ${err instanceof Error ? err.message : "unknown error"}`,
      p_reference_id: referenceId,
    });

    // Return 503 for LLM service errors (billing, rate limit, overload)
    if (err instanceof LLMServiceError) {
      return Response.json(
        { error: "service_unavailable", code: err.code, message: err.message },
        { status: 503 },
      );
    }

    const statusCode = err instanceof BackendError ? err.statusCode : 500;
    return Response.json(
      { error: err instanceof Error ? err.message : "Backend error" },
      { status: statusCode },
    );
  }
}

/**
 * Execute backend logic for trial (unauthenticated) searches.
 * No credit deduction.
 */
export async function executeTrialSearch(body: string): Promise<Record<string, unknown>> {
  const request: SearchRequest = JSON.parse(body);
  const result = await handleSearch(request);
  return result as unknown as Record<string, unknown>;
}

class BackendError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function executeBackendLogic(
  operation: CreditOperation,
  backendPath: string,
  fetchOptions?: RequestInit,
): Promise<Record<string, unknown>> {
  switch (operation) {
    case "search": {
      const body = fetchOptions?.body;
      if (!body) throw new BackendError("Missing request body", 400);
      const request: SearchRequest = JSON.parse(body as string);
      const result = await handleSearch(request);
      return result as unknown as Record<string, unknown>;
    }

    case "paper_detail": {
      // Parse paper ID and language from path like /paper/{id}/detail?language=ja
      const match = backendPath.match(/\/paper\/([^/]+)\/detail/);
      if (!match) throw new BackendError("Invalid path", 400);
      const paperId = decodeURIComponent(match[1]);
      const url = new URL(`http://dummy${backendPath}`);
      const language = url.searchParams.get("language") || "ja";
      const result = await handlePaperDetail(paperId, language);
      return result as unknown as Record<string, unknown>;
    }

    case "fulltext": {
      // Parse paper ID, language, difficulty from path like /paper/{id}/fulltext?language=ja&difficulty=layperson
      const match = backendPath.match(/\/paper\/([^/]+)\/fulltext/);
      if (!match) throw new BackendError("Invalid path", 400);
      const paperId = decodeURIComponent(match[1]);
      const url = new URL(`http://dummy${backendPath}`);
      const language = url.searchParams.get("language") || "ja";
      const difficulty = url.searchParams.get("difficulty") || "layperson";
      const result = await handleFulltext(paperId, language, difficulty);
      return result as unknown as Record<string, unknown>;
    }

    default:
      throw new BackendError(`Unknown operation: ${operation}`, 400);
  }
}
