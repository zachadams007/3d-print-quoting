import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

  const storagePath = req.nextUrl.searchParams.get("path");
  const fileName = req.nextUrl.searchParams.get("name");

  if (!storagePath) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("print-files")
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const arrayBuffer = await data.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName || "file"}"`,
    },
  });
}
