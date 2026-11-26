import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: item, error } = await supabase
    .from("store_items")
    .select(
      `*,
      images:store_item_images(id, storage_path, sort_order, alt_text),
      option_groups:store_item_option_groups(
        id, name, sort_order,
        choices:store_item_option_choices(id, label, price_delta, sort_order, is_active)
      )`
    )
    .eq("slug", slug)
    .eq("is_visible", true)
    .single();

  if (error || !item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const enriched = {
    ...item,
    images: ((item.images as unknown[]) ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((img: any) => ({
        ...img,
        url: `${supabaseUrl}/storage/v1/object/public/store-images/${img.storage_path}`,
      })),
    option_groups: ((item.option_groups as unknown[]) ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((g: any) => ({
        ...g,
        choices: (g.choices ?? [])
          .filter((c: any) => c.is_active)
          .sort((a: any, b: any) => a.sort_order - b.sort_order),
      })),
  };

  return NextResponse.json(enriched);
}
