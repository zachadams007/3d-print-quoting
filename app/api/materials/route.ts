import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("in_stock", true)
      .order("name");

    if (error) {
      console.error("[API /materials] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /materials] Unexpected error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
