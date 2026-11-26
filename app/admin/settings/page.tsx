"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Material, Settings, Color, MaterialColor } from "@/lib/types";
import { Trash2, Plus } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [materialColors, setMaterialColors] = useState<MaterialColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMats, setSavingMats] = useState(false);
  const [savingColors, setSavingColors] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/materials").then((r) => r.json()),
      fetch("/api/admin/colors").then((r) => r.json()),
      fetch("/api/admin/material-colors").then((r) => r.json()),
    ]).then(([s, m, c, mc]) => {
      setSettings(s);
      setMaterials(m);
      setColors(Array.isArray(c) ? c : []);
      setMaterialColors(Array.isArray(mc) ? mc : []);
      setLoading(false);
    });
  }, []);

  const updateField = (key: keyof Settings, value: unknown) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);

    const { id, ...body } = settings;
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
    setSavingSettings(false);
  };

  const handleUpdateMaterial = async (mat: Material) => {
    setSavingMats(true);
    const { id, ...body } = mat;
    const res = await fetch(`/api/admin/materials/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast.success(`${mat.name} updated`);
    } else {
      toast.error("Failed to update material");
    }
    setSavingMats(false);
  };

  const handleAddMaterial = async () => {
    const name = prompt("Material name:");
    if (!name) return;

    const res = await fetch("/api/admin/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        in_stock: true,
        density_g_cm3: 1.24,
        price_per_gram: 0.2,
        price_per_gram_slope: 0,
        time_multiplier: 1.0,
      }),
    });

    if (res.ok) {
      const newMat = await res.json();
      setMaterials((prev) => [...prev, newMat]);
      toast.success("Material added");
    } else {
      toast.error("Failed to add material");
    }
  };

  const handleDeleteMaterial = async (mat: Material) => {
    if (!confirm(`Delete ${mat.name}?`)) return;

    const res = await fetch(`/api/admin/materials/${mat.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setMaterials((prev) => prev.filter((m) => m.id !== mat.id));
      setMaterialColors((prev) =>
        prev.filter((mc) => mc.material_id !== mat.id)
      );
      toast.success("Material deleted");
    } else {
      toast.error("Cannot delete — may be in use by existing requests");
    }
  };

  const updateMat = (idx: number, key: keyof Material, value: unknown) => {
    setMaterials((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m))
    );
  };

  const handleUpdateColor = async (color: Color) => {
    setSavingColors(true);
    const { id, ...body } = color;
    const res = await fetch(`/api/admin/colors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) toast.success(`${color.name} updated`);
    else toast.error("Failed to update color");
    setSavingColors(false);
  };

  const handleAddColor = async () => {
    const name = prompt("Color name:");
    if (!name) return;

    const res = await fetch("/api/admin/colors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        hex_code: null,
        in_stock: true,
        price_multiplier: 1.0,
      }),
    });

    if (res.ok) {
      const newColor = await res.json();
      setColors((prev) => [...prev, newColor]);
      toast.success("Color added — assign it to materials below");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to add color");
    }
  };

  const handleDeleteColor = async (color: Color) => {
    if (!confirm(`Delete ${color.name}?`)) return;

    const res = await fetch(`/api/admin/colors/${color.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setColors((prev) => prev.filter((c) => c.id !== color.id));
      setMaterialColors((prev) =>
        prev.filter((mc) => mc.color_id !== color.id)
      );
      toast.success("Color deleted");
    } else {
      toast.error("Cannot delete — may be in use by existing requests");
    }
  };

  const updateColor = (idx: number, key: keyof Color, value: unknown) => {
    setColors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [key]: value } : c))
    );
  };

  const isColorAssigned = (materialId: string, colorId: string) =>
    materialColors.some(
      (mc) => mc.material_id === materialId && mc.color_id === colorId
    );

  const handleToggleMaterialColor = async (
    materialId: string,
    colorId: string
  ) => {
    const assigned = isColorAssigned(materialId, colorId);

    const res = await fetch("/api/admin/material-colors", {
      method: assigned ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: materialId, color_id: colorId }),
    });

    if (res.ok) {
      if (assigned) {
        setMaterialColors((prev) =>
          prev.filter(
            (mc) =>
              !(mc.material_id === materialId && mc.color_id === colorId)
          )
        );
      } else {
        setMaterialColors((prev) => [
          ...prev,
          { material_id: materialId, color_id: colorId },
        ]);
      }
    } else {
      toast.error("Failed to update color availability");
    }
  };

  if (loading || !settings) {
    return <p className="py-12 text-center text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Materials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Materials</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddMaterial}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {materials.map((mat, idx) => {
            const slope = mat.price_per_gram_slope ?? 0;
            const ppg = (g: number) =>
              mat.price_per_gram + slope * Math.min(g, 100);
            const totalAt = (g: number) => g * ppg(g);

            return (
              <div
                key={mat.id}
                className="rounded-md border p-4 space-y-3"
              >
                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={mat.name}
                      onChange={(e) => updateMat(idx, "name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Density (g/cm³)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mat.density_g_cm3}
                      onChange={(e) =>
                        updateMat(idx, "density_g_cm3", parseFloat(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price/g base ($)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={mat.price_per_gram}
                      onChange={(e) =>
                        updateMat(idx, "price_per_gram", parseFloat(e.target.value))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price/g slope</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={mat.price_per_gram_slope ?? 0}
                      onChange={(e) =>
                        updateMat(
                          idx,
                          "price_per_gram_slope",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={mat.in_stock}
                        onChange={(e) =>
                          updateMat(idx, "in_stock", e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                      In Stock
                    </label>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateMaterial(mat)}
                      disabled={savingMats}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMaterial(mat)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-6">
                  <div className="space-y-1">
                    <Label className="text-xs">Time Mult.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mat.time_multiplier}
                      onChange={(e) =>
                        updateMat(
                          idx,
                          "time_multiplier",
                          parseFloat(e.target.value)
                        )
                      }
                    />
                  </div>
                  {slope !== 0 && (
                    <div className="sm:col-span-5 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        $/g — 10g:&nbsp;${ppg(10).toFixed(3)}
                        &nbsp;&nbsp;50g:&nbsp;${ppg(50).toFixed(3)}
                        &nbsp;&nbsp;100g+:&nbsp;${ppg(100).toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Material cost — 10g:&nbsp;${totalAt(10).toFixed(2)}
                        &nbsp;&nbsp;30g:&nbsp;${totalAt(30).toFixed(2)}
                        &nbsp;&nbsp;60g:&nbsp;${totalAt(60).toFixed(2)}
                        &nbsp;&nbsp;100g:&nbsp;${totalAt(100).toFixed(2)}
                        &nbsp;&nbsp;200g:&nbsp;${totalAt(200).toFixed(2)}
                        &nbsp;&nbsp;500g:&nbsp;${totalAt(500).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Colors</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddColor}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {colors.map((color, idx) => (
            <div
              key={color.id}
              className="rounded-md border p-4 space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={color.name}
                    onChange={(e) => updateColor(idx, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hex Code</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={color.hex_code ?? ""}
                      onChange={(e) =>
                        updateColor(idx, "hex_code", e.target.value || null)
                      }
                      placeholder="#000000"
                    />
                    {color.hex_code && (
                      <div
                        className="h-8 w-8 shrink-0 rounded border"
                        style={{ backgroundColor: color.hex_code }}
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price Mult.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={color.price_multiplier}
                    onChange={(e) =>
                      updateColor(
                        idx,
                        "price_multiplier",
                        parseFloat(e.target.value) || 1.0
                      )
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={color.in_stock}
                      onChange={(e) =>
                        updateColor(idx, "in_stock", e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    In Stock
                  </label>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateColor(color)}
                    disabled={savingColors}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteColor(color)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Material availability checkboxes */}
              {materials.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Available in:
                  </span>
                  {materials.map((mat) => (
                    <label
                      key={mat.id}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={isColorAssigned(mat.id, color.id)}
                        onChange={() =>
                          handleToggleMaterialColor(mat.id, color.id)
                        }
                        className="h-4 w-4"
                      />
                      {mat.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {colors.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No colors configured. Add one to let customers pick a color.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumField
              label="Minimum Price ($)"
              value={settings.minimum_price}
              onChange={(v) => updateField("minimum_price", v)}
            />
            <NumField
              label="Setup Fee — Standard ($)"
              value={settings.setup_fee_standard}
              onChange={(v) => updateField("setup_fee_standard", v)}
            />
            <NumField
              label="Setup Fee — Special ($)"
              value={settings.setup_fee_special}
              onChange={(v) => updateField("setup_fee_special", v)}
            />
            <NumField
              label="Supports Fee ($)"
              value={settings.supports_fee}
              onChange={(v) => updateField("supports_fee", v)}
            />
            <NumField
              label="Rush Multiplier"
              value={settings.rush_multiplier}
              onChange={(v) => updateField("rush_multiplier", v)}
            />
            <NumField
              label="Time Rate / Hour ($)"
              value={settings.time_rate_per_hour}
              onChange={(v) => updateField("time_rate_per_hour", v)}
            />
          </div>

          <Separator className="my-4" />
          <p className="mb-2 text-sm font-medium">Infill Multipliers</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["15", "25", "40"] as const).map((k) => (
              <NumField
                key={k}
                label={`${k}% Infill`}
                value={settings.infill_multipliers[k] ?? 1}
                onChange={(v) =>
                  updateField("infill_multipliers", {
                    ...settings.infill_multipliers,
                    [k]: v,
                  })
                }
              />
            ))}
          </div>

          <Separator className="my-4" />
          <p className="mb-2 text-sm font-medium">Quality Multipliers</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["0.28", "0.20", "0.12"] as const).map((k) => (
              <NumField
                key={k}
                label={`${k}mm`}
                value={settings.quality_multipliers[k] ?? 1}
                onChange={(v) =>
                  updateField("quality_multipliers", {
                    ...settings.quality_multipliers,
                    [k]: v,
                  })
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estimation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estimation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumField
              label="Waste Factor"
              value={settings.waste_factor}
              onChange={(v) => updateField("waste_factor", v)}
            />
            <NumField
              label="Base Hours / cm³"
              value={settings.base_hours_per_cm3}
              onChange={(v) => updateField("base_hours_per_cm3", v)}
              step="0.01"
            />
            <NumField
              label="Overhead Hours"
              value={settings.overhead_hours}
              onChange={(v) => updateField("overhead_hours", v)}
            />
            <NumField
              label="Print Hours / Day"
              value={settings.printing_hours_per_day}
              onChange={(v) => updateField("printing_hours_per_day", v)}
            />
            <NumField
              label="Buffer Hours / Job"
              value={settings.buffer_hours_per_job}
              onChange={(v) => updateField("buffer_hours_per_job", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Business Text */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Text</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contact Instructions</Label>
            <Textarea
              rows={3}
              value={settings.contact_instructions}
              onChange={(e) =>
                updateField("contact_instructions", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Disclaimer Text</Label>
            <Textarea
              rows={3}
              value={settings.disclaimer_text}
              onChange={(e) => updateField("disclaimer_text", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        size="lg"
        onClick={handleSaveSettings}
        disabled={savingSettings}
        className="w-full"
      >
        {savingSettings ? "Saving..." : "Save All Settings"}
      </Button>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
