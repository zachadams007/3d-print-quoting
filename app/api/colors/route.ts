import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    const materialId = req.nextUrl.searchParams.get("material_id");

    // If a material is specified, only return colors explicitly linked
    // to that material and currently marked in_stock.
    if (materialId) {
      const { data, error } = await supabase
        .from("material_colors")
        .select("material_id, color_id, colors(*)")
        .eq("material_id", materialId)
        .eq("colors.in_stock", true);

      if (error) {
        console.error("[API /colors] Supabase error (by material):", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const colors =
        (data ?? [])
          .map((row: any) => row.colors)
          .filter((c: any) => c && typeof c.name === "string")
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return NextResponse.json(colors);
    }

    // Fallback: all in-stock colors
    const { data, error } = await supabase
      .from("colors")
      .select("*")
      .eq("in_stock", true)
      .order("name");

    if (error) {
      console.error("[API /colors] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /colors] Unexpected error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
