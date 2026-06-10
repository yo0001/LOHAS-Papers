import { type NextRequest } from "next/server";
import { authenticatedProxy, extractBYOKConfig } from "@/lib/api-proxy";
import { headers } from "next/headers";

export const maxDuration = 60;

/**
 * POST /api/ai/paper/[id]/vocabulary
 * Body: { abstract?: string, pdf_url?: string }
 *
 * Accepts the paper abstract/PDF URL from the frontend to avoid
 * redundant Semantic Scholar API calls (prevents 429 rate limits
 * in Vercel serverless where in-memory cache is not shared).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Parse body for paper text hints
  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    // empty body is OK
  }

  // Check for BYOK headers
  const headerStore = await headers();
  const byokConfig = extractBYOKConfig(new Headers({
    "x-byok-provider": headerStore.get("x-byok-provider") ?? "",
    "x-byok-key": headerStore.get("x-byok-key") ?? "",
    "x-byok-model": headerStore.get("x-byok-model") ?? "",
  }));

  const backendPath = `/paper/${encodeURIComponent(id)}/vocabulary`;

  return authenticatedProxy(
    "vocabulary",
    backendPath,
    { method: "POST", body: bodyText },
    undefined,
    byokConfig,
  );
}

// Keep GET for backward compatibility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const headerStore = await headers();
  const byokConfig = extractBYOKConfig(new Headers({
    "x-byok-provider": headerStore.get("x-byok-provider") ?? "",
    "x-byok-key": headerStore.get("x-byok-key") ?? "",
    "x-byok-model": headerStore.get("x-byok-model") ?? "",
  }));

  return authenticatedProxy(
    "vocabulary",
    `/paper/${encodeURIComponent(id)}/vocabulary`,
    undefined,
    undefined,
    byokConfig,
  );
}
