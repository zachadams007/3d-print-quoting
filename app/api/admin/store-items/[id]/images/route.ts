import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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
  const { storage_path, sort_order, alt_text } = body;

  if (!storage_path) {
    return NextResponse.json(
      { error: "storage_path is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("store_item_images")
    .insert({
      store_item_id: id,
      storage_path,
      sort_order: sort_order ?? 0,
      alt_text: alt_text ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return NextResponse.json({
    ...data,
    url: `${supabaseUrl}/storage/v1/object/public/store-images/${data.storage_path}`,
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== "owner@example.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const imageId = url.searchParams.get("imageId");
  if (!imageId) {
    return NextResponse.json(
      { error: "imageId is required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data: img } = await adminClient
    .from("store_item_images")
    .select("storage_path")
    .eq("id", imageId)
    .single();

  if (img) {
    await adminClient.storage
      .from("store-images")
      .remove([img.storage_path]);
  }

  const { error } = await adminClient
    .from("store_item_images")
    .delete()
    .eq("id", imageId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
