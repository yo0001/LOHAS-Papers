import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect AI API routes — require authentication
  // Exception: /api/ai/search allows unauthenticated trial access (controlled in route handler)
  if (request.nextUrl.pathname.startsWith("/api/ai/") && !user) {
    if (request.nextUrl.pathname === "/api/ai/search") {
      return supabaseResponse; // route handler controls trial access
    }
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  return supabaseResponse;
}
