import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("store_items")
    .select(
      `*, images:store_item_images(id, storage_path, sort_order, alt_text)`
    )
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const items = (data ?? []).map((item) => ({
    ...item,
    images: ((item.images as unknown[]) ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((img: any) => ({
        ...img,
        url: `${supabaseUrl}/storage/v1/object/public/store-images/${img.storage_path}`,
      })),
  }));

  return NextResponse.json(items);
}
