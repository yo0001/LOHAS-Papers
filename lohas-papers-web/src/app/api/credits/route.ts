import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  return Response.json({ credits: data?.credits ?? 0 });
}
