import { type NextRequest } from "next/server";
import { authenticatedProxy, extractBYOKConfig } from "@/lib/api-proxy";
import { headers } from "next/headers";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check for BYOK headers
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
