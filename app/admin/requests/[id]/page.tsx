"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  REQUEST_STATUS_LABELS,
  STATUS_PIPELINE,
  QUALITY_LABELS,
  INFILL_LABELS,
  type RequestStatus,
  type PrintRequest,
  type RequestFile,
  type QualityPreset,
  type InfillPreset,
  type StoreOptionsSelected,
} from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { ArrowLeft, Download, FileText, Trash2 } from "lucide-react";

export default function AdminRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [request, setRequest] = useState<PrintRequest | null>(null);
  const [files, setFiles] = useState<RequestFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [status, setStatus] = useState<RequestStatus>("submitted");
  const [finalPrice, setFinalPrice] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [publicNote, setPublicNote] = useState("");

  useEffect(() => {
    fetch(`/api/admin/requests/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.request) {
          setRequest(data.request);
          setFiles(data.files);
          setStatus(data.request.status);
          setFinalPrice(data.request.final_price?.toString() ?? "");
          setInternalNotes(data.request.internal_notes ?? "");
          setPublicNote(data.request.public_note ?? "");
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, unknown> = { status, public_note: publicNote, internal_notes: internalNotes };
    if (finalPrice) body.final_price = parseFloat(finalPrice);
    else body.final_price = null;

    const res = await fetch(`/api/admin/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setRequest((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success("Request updated");
    } else {
      toast.error("Failed to update request");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this request and all its files? This cannot be undone."))
      return;

    const res = await fetch(`/api/admin/requests/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Request deleted");
      router.push("/admin");
    } else {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">Loading...</p>;
  }

  if (!request) {
    return <p className="py-12 text-center text-muted-foreground">Request not found.</p>;
  }

  const q = request.quality_preset as QualityPreset;
  const inf = request.infill_preset as InfillPreset;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Request Detail</h1>
            <p className="font-mono text-xs text-muted-foreground">{id}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={request.customer_name} />
            <Row label="Email" value={request.customer_email} />
            <Row label="Snapchat" value={request.customer_snapchat || "—"} />
            <Row
              label="Date"
              value={new Date(request.created_at).toLocaleString()}
            />
            {request.customer_notes && (
              <>
                <Separator className="my-2" />
                <div>
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1 whitespace-pre-line">
                    {request.customer_notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Print / Store Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {request.request_source === "store" ? "Store Item Details" : "Print Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row
              label="Source"
              value={request.request_source === "store" ? "Store" : "File Upload"}
            />

            {request.request_source === "store" ? (
              <>
                <Row
                  label="Store Item"
                  value={request.store_items?.title ?? "—"}
                />
                <Row
                  label="Base Price"
                  value={
                    request.store_items?.base_price != null
                      ? formatCurrency(request.store_items.base_price)
                      : "—"
                  }
                />
                {request.store_options_json && (
                  <>
                    <Separator className="my-2" />
                    <p className="font-medium text-muted-foreground">Selected Options</p>
                    {Object.values(
                      request.store_options_json as StoreOptionsSelected
                    ).map((opt) => (
                      <Row
                        key={opt.choice_id}
                        label={opt.group_name}
                        value={`${opt.choice_label}${opt.price_delta !== 0 ? ` (${opt.price_delta > 0 ? "+" : ""}${formatCurrency(opt.price_delta)})` : ""}`}
                      />
                    ))}
                  </>
                )}
                <Separator className="my-2" />
                <Row
                  label="Est. Price"
                  value={
                    request.estimated_price != null
                      ? formatCurrency(request.estimated_price)
                      : "—"
                  }
                />
              </>
            ) : (
              <>
                <Row label="Material" value={request.materials?.name ?? "—"} />
                <Row label="Color" value={request.colors?.name ?? "—"} />
                <Row label="Quality" value={QUALITY_LABELS[q] ?? q} />
                <Row label="Infill" value={INFILL_LABELS[inf] ?? inf} />
                <Row label="Supports" value={request.supports ? "Yes" : "No"} />
                <Row label="Rush" value={request.rush ? "Yes (+25%)" : "No"} />
                <Separator className="my-2" />
                <Row
                  label="Est. Volume"
                  value={
                    request.estimated_volume_cm3 != null
                      ? `${formatNumber(request.estimated_volume_cm3)} cm³`
                      : "—"
                  }
                />
                <Row
                  label="Est. Grams"
                  value={
                    request.estimated_grams != null
                      ? `${formatNumber(request.estimated_grams)} g`
                      : "—"
                  }
                />
                <Row
                  label="Est. Time"
                  value={
                    request.estimated_time_hours != null
                      ? `${formatNumber(request.estimated_time_hours, 1)} hrs`
                      : "—"
                  }
                />
                <Row
                  label="Est. Price"
                  value={
                    request.estimated_price != null
                      ? formatCurrency(request.estimated_price)
                      : "—"
                  }
                />
                {request.manual_estimate_required && (
                  <Badge variant="warning" className="mt-2">
                    Manual estimate required
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Files (only for upload requests) */}
        {request.request_source !== "store" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Files ({files.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files.</p>
              ) : (
                <ul className="space-y-2">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{f.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(f.file_size / 1024 / 1024).toFixed(1)} MB
                            {f.volume_cm3 != null &&
                              ` · ${formatNumber(f.volume_cm3)} cm³`}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/api/admin/requests/${id}/download?path=${encodeURIComponent(f.storage_path)}&name=${encodeURIComponent(f.file_name)}`}
                        download
                      >
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
              >
                {[...STATUS_PIPELINE, "cancelled" as RequestStatus].map(
                  (s) => (
                    <option key={s} value={s}>
                      {REQUEST_STATUS_LABELS[s]}
                    </option>
                  )
                )}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Final Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                placeholder="Leave blank until confirmed"
              />
            </div>

            <div className="space-y-2">
              <Label>Public Note (visible to customer)</Label>
              <Textarea
                value={publicNote}
                onChange={(e) => setPublicNote(e.target.value)}
                rows={2}
                placeholder="e.g. Your print is running! ETA tomorrow."
              />
            </div>

            <div className="space-y-2">
              <Label>Internal Notes (admin only)</Label>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
                placeholder="Private notes..."
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
