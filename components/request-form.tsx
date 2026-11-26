"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { EstimatePanel } from "@/components/estimate-panel";
import { parseSTL } from "@/lib/estimator/stl-parser";
import { parseThreeMF } from "@/lib/estimator/threemf-parser";
import { calculateEstimate } from "@/lib/estimator/calculator";
import { createClient } from "@/lib/supabase/client";
import type {
  Material,
  Settings,
  Color,
  FileEstimate,
  Estimate,
  QualityPreset,
  InfillPreset,
} from "@/lib/types";
import { QUALITY_LABELS, INFILL_LABELS } from "@/lib/types";

export function RequestForm() {
  const router = useRouter();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingColors, setLoadingColors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [fileEstimates, setFileEstimates] = useState<FileEstimate[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [notes, setNotes] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [colorId, setColorId] = useState("");
  const [quality, setQuality] = useState<QualityPreset>("0.20");
  const [infill, setInfill] = useState<InfillPreset>("15");
  const [supports, setSupports] = useState(false);
  const [rush, setRush] = useState(false);

  const fetchColorsForMaterial = useCallback(async (matId: string) => {
    setLoadingColors(true);
    try {
      const res = await fetch(`/api/colors?material_id=${matId}`);
      const cols = await res.json();
      const list = Array.isArray(cols) ? cols : [];
      setColors(list);
      setColorId(list.length > 0 ? list[0].id : "");
    } catch {
      setColors([]);
      setColorId("");
    }
    setLoadingColors(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch("/api/materials"),
          fetch("/api/settings/public"),
        ]);
        const matsRaw: unknown = await mRes.json();
        const settingsRaw: unknown = await sRes.json();
        const mats =
          mRes.ok && Array.isArray(matsRaw) ? (matsRaw as Material[]) : [];
        const s: Settings | null =
          sRes.ok &&
          settingsRaw &&
          typeof settingsRaw === "object" &&
          settingsRaw !== null &&
          !("error" in settingsRaw)
            ? (settingsRaw as Settings)
            : null;
        if (cancelled) return;
        setMaterials(mats);
        setSettings(s);
        if (mats.length > 0) {
          setMaterialId(mats[0].id);
          fetchColorsForMaterial(mats[0].id);
        }
        if (!cancelled && (!mRes.ok || !sRes.ok)) {
          toast.error(
            "Could not load print options. Check Vercel env vars (Supabase URL + service role key)."
          );
        }
      } catch {
        if (!cancelled) {
          setMaterials([]);
          setSettings(null);
          toast.error("Could not load print options. Please refresh or try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchColorsForMaterial]);

  const handleMaterialChange = useCallback(
    (newMaterialId: string) => {
      setMaterialId(newMaterialId);
      fetchColorsForMaterial(newMaterialId);
    },
    [fetchColorsForMaterial]
  );

  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId) ?? null,
    [materials, materialId]
  );

  const selectedColor = useMemo(
    () => colors.find((c) => c.id === colorId) ?? null,
    [colors, colorId]
  );

  const estimate: Estimate | null = useMemo(() => {
    if (!selectedMaterial || !settings || fileEstimates.length === 0)
      return null;
    return calculateEstimate({
      fileEstimates,
      material: selectedMaterial,
      settings,
      qualityPreset: quality,
      infillPreset: infill,
      supports,
      rush,
      colorPriceMultiplier: selectedColor?.price_multiplier ?? 1.0,
    });
  }, [fileEstimates, selectedMaterial, settings, quality, infill, supports, rush, selectedColor]);

  const processFile = useCallback(
    async (file: File): Promise<FileEstimate> => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      const buffer = await file.arrayBuffer();

      if (ext === "stl") {
        try {
          const result = parseSTL(buffer);
          return {
            fileName: file.name,
            fileExt: ext,
            fileSize: file.size,
            volumeCm3: result.volumeCm3,
            surfaceAreaMm2: result.surfaceAreaMm2,
            manualRequired: false,
          };
        } catch {
          return {
            fileName: file.name,
            fileExt: ext,
            fileSize: file.size,
            volumeCm3: null,
            surfaceAreaMm2: null,
            manualRequired: true,
            error: "Failed to parse STL",
          };
        }
      }

      if (ext === "3mf") {
        try {
          const result = await parseThreeMF(buffer);
          if (result.parsed) {
            return {
              fileName: file.name,
              fileExt: ext,
              fileSize: file.size,
              volumeCm3: result.volumeCm3,
              surfaceAreaMm2: result.surfaceAreaMm2,
              manualRequired: false,
            };
          }
          return {
            fileName: file.name,
            fileExt: ext,
            fileSize: file.size,
            volumeCm3: null,
            surfaceAreaMm2: null,
            manualRequired: true,
          };
        } catch {
          return {
            fileName: file.name,
            fileExt: ext,
            fileSize: file.size,
            volumeCm3: null,
            surfaceAreaMm2: null,
            manualRequired: true,
          };
        }
      }

      return {
        fileName: file.name,
        fileExt: ext,
        fileSize: file.size,
        volumeCm3: null,
        surfaceAreaMm2: null,
        manualRequired: true,
        error: "Unsupported file type",
      };
    },
    []
  );

  const handleFilesAdded = useCallback(
    async (newFiles: File[]) => {
      setProcessing(true);
      const estimates = await Promise.all(newFiles.map(processFile));
      setFiles((prev) => [...prev, ...newFiles]);
      setFileEstimates((prev) => [...prev, ...estimates]);
      setProcessing(false);
    },
    [processFile]
  );

  const handleFileRemoved = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileEstimates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (files.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Upload files directly to Supabase Storage
      const tempId = uuidv4();
      const filesMeta: {
        file_name: string;
        file_ext: string;
        file_size: number;
        storage_path: string;
        volume_cm3: number | null;
      }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fe = fileEstimates[i];
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "unknown";
        const storagePath = `${tempId}/${uuidv4()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("print-files")
          .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          setSubmitting(false);
          return;
        }

        filesMeta.push({
          file_name: file.name,
          file_ext: ext,
          file_size: file.size,
          storage_path: storagePath,
          volume_cm3: fe.volumeCm3,
        });
      }

      // 2. Create request with file metadata
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_snapchat: snapchat.trim() || null,
          customer_notes: notes.trim() || null,
          material_id: materialId,
          color_id: colorId || null,
          quality_preset: quality,
          infill_preset: infill,
          supports,
          rush,
          estimated_volume_cm3: estimate?.totalVolumeCm3 ?? null,
          estimated_grams: estimate?.grams ?? null,
          estimated_time_hours: estimate?.timeHours ?? null,
          estimated_turnaround_days: estimate?.turnaroundDays ?? null,
          estimated_price: estimate?.price ?? null,
          manual_estimate_required: estimate?.manualRequired ?? true,
          files: filesMeta,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        setSubmitting(false);
        return;
      }

      router.push(`/confirmation/${data.id}?token=${data.public_token}`);
    } catch {
      toast.error("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* LEFT: Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Files</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload
                fileEstimates={fileEstimates}
                onFilesAdded={handleFilesAdded}
                onFileRemoved={handleFileRemoved}
                processing={processing}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Print Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Select
                    id="material"
                    value={materialId}
                    onChange={(e) => handleMaterialChange(e.target.value)}
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {(colors.length > 0 || loadingColors) && (
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Select
                      id="color"
                      value={colorId}
                      onChange={(e) => setColorId(e.target.value)}
                      disabled={loadingColors}
                    >
                      {loadingColors ? (
                        <option>Loading...</option>
                      ) : (
                        colors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="quality">Quality</Label>
                  <Select
                    id="quality"
                    value={quality}
                    onChange={(e) =>
                      setQuality(e.target.value as QualityPreset)
                    }
                  >
                    {(
                      Object.entries(QUALITY_LABELS) as [
                        QualityPreset,
                        string,
                      ][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="infill">Infill</Label>
                  <Select
                    id="infill"
                    value={infill}
                    onChange={(e) =>
                      setInfill(e.target.value as InfillPreset)
                    }
                  >
                    {(
                      Object.entries(INFILL_LABELS) as [InfillPreset, string][]
                    ).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={supports}
                    onChange={(e) => setSupports(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Supports needed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rush}
                    onChange={(e) => setRush(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Rush order (+25%)
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="snapchat">Snapchat Username (optional)</Label>
                <Input
                  id="snapchat"
                  value={snapchat}
                  onChange={(e) => setSnapchat(e.target.value)}
                  placeholder="your_snapchat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, color preferences, etc."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {settings?.disclaimer_text && (
            <p className="rounded-md bg-muted px-4 py-3 text-xs text-muted-foreground">
              {settings.disclaimer_text}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting || files.length === 0}
          >
            {submitting ? "Submitting..." : "Submit Print Request"}
          </Button>
        </div>

        {/* RIGHT: Estimate Panel (sticky on desktop) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <EstimatePanel
            estimate={estimate}
            hasFiles={fileEstimates.length > 0}
          />
        </div>
      </div>
    </form>
  );
}
