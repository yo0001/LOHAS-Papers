import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("byok_config")
    .eq("id", user.id)
    .single();

  if (error) {
    return Response.json({ error: "Failed to fetch BYOK config" }, { status: 500 });
  }

  return Response.json({ byok_config: data?.byok_config ?? null });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config = body as { provider?: string; apiKey?: string; model?: string; enabled?: boolean };
  if (!config.provider || !config.apiKey || !config.model) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const byokConfig = {
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
    enabled: config.enabled ?? true,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ byok_config: byokConfig })
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: "Failed to save BYOK config" }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ byok_config: null })
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: "Failed to delete BYOK config" }, { status: 500 });
  }

  return Response.json({ success: true });
}
