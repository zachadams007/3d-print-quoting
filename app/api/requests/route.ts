import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStatusUrl,
  sendAdminNewRequestNotification,
  sendCustomerConfirmation,
} from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    const requestSource = body.request_source ?? "upload";

    if (requestSource === "store") {
      return handleStoreRequest(supabase, body);
    }

    return handleUploadRequest(supabase, body);
  } catch (err) {
    console.error("Request creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleUploadRequest(supabase: any, body: any) {
  const {
    customer_name,
    customer_email,
    customer_snapchat,
    customer_notes,
    material_id,
    color_id,
    quality_preset,
    infill_preset,
    supports,
    rush,
    estimated_volume_cm3,
    estimated_grams,
    estimated_time_hours,
    estimated_turnaround_days,
    estimated_price,
    manual_estimate_required,
    files: filesMeta,
  } = body;

  if (!customer_name || !customer_email || !material_id) {
    return NextResponse.json(
      { error: "Name, email, and material are required" },
      { status: 400 }
    );
  }

  if (!filesMeta || filesMeta.length === 0) {
    return NextResponse.json(
      { error: "At least one file is required" },
      { status: 400 }
    );
  }

  const { data: request, error: reqError } = await supabase
    .from("requests")
    .insert({
      customer_name,
      customer_email,
      customer_snapchat: customer_snapchat || null,
      customer_notes: customer_notes || null,
      material_id,
      color_id: color_id || null,
      quality_preset,
      infill_preset,
      supports: !!supports,
      rush: !!rush,
      estimated_volume_cm3: estimated_volume_cm3 ?? null,
      estimated_grams: estimated_grams ?? null,
      estimated_time_hours: estimated_time_hours ?? null,
      estimated_turnaround_days: estimated_turnaround_days ?? null,
      estimated_price: estimated_price ?? null,
      manual_estimate_required: !!manual_estimate_required,
      request_source: "upload",
      status: "submitted",
    })
    .select("id, public_token")
    .single();

  if (reqError || !request) {
    return NextResponse.json(
      { error: reqError?.message ?? "Failed to create request" },
      { status: 500 }
    );
  }

  for (const fm of filesMeta) {
    await supabase.from("request_files").insert({
      request_id: request.id,
      file_name: fm.file_name,
      file_ext: fm.file_ext,
      file_size: fm.file_size,
      storage_path: fm.storage_path,
      volume_cm3: fm.volume_cm3 ?? null,
    });
  }

  const statusUrl = getStatusUrl(request.public_token);
  await sendAdminNewRequestNotification({
    requestId: request.id,
    requestSource: "upload",
    customerName: customer_name,
    customerEmail: customer_email,
    statusUrl,
  });
  await sendCustomerConfirmation({
    to: customer_email,
    customerName: customer_name,
    requestId: request.id,
    statusUrl,
    isStoreRequest: false,
  });

  return NextResponse.json({
    id: request.id,
    public_token: request.public_token,
  });
}

async function handleStoreRequest(supabase: any, body: any) {
  const {
    customer_name,
    customer_email,
    customer_snapchat,
    customer_notes,
    store_item_id,
    store_options_json,
    estimated_price,
  } = body;

  if (!customer_name || !customer_email || !store_item_id) {
    return NextResponse.json(
      { error: "Name, email, and store item are required" },
      { status: 400 }
    );
  }

  const { data: request, error: reqError } = await supabase
    .from("requests")
    .insert({
      customer_name,
      customer_email,
      customer_snapchat: customer_snapchat || null,
      customer_notes: customer_notes || null,
      request_source: "store",
      store_item_id,
      store_options_json: store_options_json ?? null,
      estimated_price: estimated_price ?? null,
      manual_estimate_required: false,
      status: "submitted",
    })
    .select("id, public_token")
    .single();

  if (reqError || !request) {
    return NextResponse.json(
      { error: reqError?.message ?? "Failed to create request" },
      { status: 500 }
    );
  }

  const statusUrl = getStatusUrl(request.public_token);
  await sendAdminNewRequestNotification({
    requestId: request.id,
    requestSource: "store",
    customerName: customer_name,
    customerEmail: customer_email,
    statusUrl,
    extra: "Store item request",
  });
  await sendCustomerConfirmation({
    to: customer_email,
    customerName: customer_name,
    requestId: request.id,
    statusUrl,
    isStoreRequest: true,
  });

  return NextResponse.json({
    id: request.id,
    public_token: request.public_token,
  });
}
