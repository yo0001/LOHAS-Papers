import { authenticatedProxy } from "@/lib/api-proxy";

export async function POST(request: Request) {
  const body = await request.text();
  return authenticatedProxy("search", "/search", {
    method: "POST",
    body,
  });
}
