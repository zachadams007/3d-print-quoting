import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createAdminClient } from "@/lib/supabase/admin";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Clock, MessageCircle } from "lucide-react";

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Request Status | 3D Print Quoting",
};

function statusVariant(
  status: RequestStatus
): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "ready":
    case "picked_up":
      return "success";
    case "cancelled":
      return "destructive";
    case "printing":
    case "awaiting_payment":
      return "warning";
    default:
      return "secondary";
  }
}

export default async function StatusPage({ params }: Props) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, public_token, created_at, status, estimated_turnaround_days, estimated_price, public_note, manual_estimate_required, customer_name, material_id, quality_preset, infill_preset, supports, rush, final_price, materials(name)"
    )
    .eq("public_token", token)
    .single();

  if (!request) notFound();

  const { count: queueAhead } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .in("status", [
      "submitted",
      "in_queue",
      "awaiting_contact",
      "awaiting_approval",
      "awaiting_payment",
      "printing",
    ])
    .lt("created_at", request.created_at);

  const queuePosition = (queueAhead ?? 0) + 1;
  const status = request.status as RequestStatus;

  const { data: settings } = await supabase
    .from("settings")
    .select("contact_instructions")
    .single();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Request Status</CardTitle>
          <p className="text-xs font-mono text-muted-foreground break-all">
            {request.id}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={statusVariant(status)}>
              {REQUEST_STATUS_LABELS[status] ?? status}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Queue Position
            </span>
            <span className="font-medium">#{queuePosition}</span>
          </div>

          {request.estimated_turnaround_days != null && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Est. Turnaround
              </span>
              <span className="font-medium">
                {request.estimated_turnaround_days} day
                {request.estimated_turnaround_days !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {request.final_price != null ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Final Price
              </span>
              <span className="text-lg font-bold">
                {formatCurrency(request.final_price)}
              </span>
            </div>
          ) : request.estimated_price != null ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Est. Price
              </span>
              <span className="font-medium">
                ~{formatCurrency(request.estimated_price)}
              </span>
            </div>
          ) : null}

          {request.public_note && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Note from printer
                </p>
                <p className="text-sm whitespace-pre-line">
                  {request.public_note}
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4" />
              Contact
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="whitespace-pre-line">
                {settings?.contact_instructions ||
                  "Add my Snapchat: your_handle. When you add me, send your Request ID so I can match you."}
              </p>
              <p>
                I&apos;ll contact you to confirm the final price/settings and
                you can pay by e-transfer or cash at pickup.
              </p>
              <p>Pickup is on main campus.</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/request"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Submit a new request
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
