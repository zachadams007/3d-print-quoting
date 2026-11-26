import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "owner@example.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    .eq("id", id)
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
        choices: (g.choices ?? []).sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        ),
      })),
  };

  return NextResponse.json(enriched);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "owner@example.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = [
    "slug",
    "title",
    "description_short",
    "description_long",
    "base_price",
    "availability_state",
    "is_visible",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("store_items")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "owner@example.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: images } = await adminClient
    .from("store_item_images")
    .select("storage_path")
    .eq("store_item_id", id);

  if (images && images.length > 0) {
    await adminClient.storage
      .from("store-images")
      .remove(images.map((img) => img.storage_path));
  }

  const { error } = await adminClient
    .from("store_items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
