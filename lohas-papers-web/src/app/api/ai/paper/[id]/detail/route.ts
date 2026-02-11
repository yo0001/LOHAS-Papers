import { type NextRequest } from "next/server";
import { authenticatedProxy } from "@/lib/api-proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "en";
  return authenticatedProxy(
    "paper_detail",
    `/paper/${encodeURIComponent(id)}/detail?language=${language}`,
  );
}
