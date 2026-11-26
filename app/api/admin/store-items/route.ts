import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "owner@example.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("store_items")
    .select(
      `*, images:store_item_images(id, storage_path, sort_order, alt_text)`
    )
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

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "owner@example.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { data, error } = await supabase
    .from("store_items")
    .insert({
      slug: body.slug,
      title: body.title,
      description_short: body.description_short ?? "",
      description_long: body.description_long ?? "",
      base_price: body.base_price ?? 0,
      availability_state: body.availability_state ?? "made_to_order",
      is_visible: body.is_visible ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
