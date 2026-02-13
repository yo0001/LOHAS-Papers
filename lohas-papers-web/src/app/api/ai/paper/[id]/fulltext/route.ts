import { type NextRequest } from "next/server";
import { authenticatedProxy } from "@/lib/api-proxy";

export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "en";
  const difficulty = searchParams.get("difficulty") || "layperson";
  return authenticatedProxy(
    "fulltext",
    `/paper/${encodeURIComponent(id)}/fulltext?language=${language}&difficulty=${difficulty}`,
  );
}
