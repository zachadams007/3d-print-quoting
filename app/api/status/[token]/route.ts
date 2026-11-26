import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("requests")
    .select("id, public_token, created_at, status, estimated_turnaround_days, estimated_price, public_note, manual_estimate_required, customer_name, material_id, quality_preset, infill_preset, supports, rush, materials(name)")
    .eq("public_token", token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const { count: activeCount } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .in("status", ["submitted", "in_queue", "awaiting_contact", "awaiting_approval", "awaiting_payment", "printing"])
    .lt("created_at", data.created_at);

  return NextResponse.json({
    ...data,
    queue_position: (activeCount ?? 0) + 1,
  });
}
