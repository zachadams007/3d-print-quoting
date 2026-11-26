"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  AVAILABILITY_LABELS,
  type StoreItem,
  type StoreItemImage,
  type StoreOptionChoice,
  type AvailabilityState,
} from "@/lib/types";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";

export default function AdminStoreItemEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [item, setItem] = useState<StoreItem | null>(null);
  const [images, setImages] = useState<StoreItemImage[]>([]);
  const [options, setOptions] = useState<StoreOptionChoice[]>([]);
  const [defaultGroupId, setDefaultGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("0");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/store-items/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setItem(data);
          setImages(data.images ?? []);
          const groups = data.option_groups ?? [];
          if (groups.length > 0) {
            setDefaultGroupId(groups[0].id);
            const allChoices = groups.flatMap(
              (g: { choices?: StoreOptionChoice[] }) => g.choices ?? []
            );
            setOptions(
              allChoices.sort(
                (a: StoreOptionChoice, b: StoreOptionChoice) =>
                  a.sort_order - b.sort_order
              )
            );
          }
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);

    const res = await fetch(`/api/admin/store-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: item.slug,
        title: item.title,
        description_short: item.description_short,
        description_long: item.description_long,
        base_price: item.base_price,
        availability_state: item.availability_state,
        is_visible: item.is_visible,
      }),
    });

    if (res.ok) {
      toast.success("Item saved");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/admin/store-items/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Item deleted");
      router.push("/admin/store");
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${id}/${uuidv4()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("store-images")
        .upload(storagePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadErr) {
        toast.error(`Upload failed: ${uploadErr.message}`);
        continue;
      }

      const res = await fetch(`/api/admin/store-items/${id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: storagePath,
          sort_order: images.length,
        }),
      });

      if (res.ok) {
        const img = await res.json();
        setImages((prev) => [...prev, img]);
      }
    }

    setUploading(false);
    toast.success("Image(s) uploaded");
    e.target.value = "";
  };

  const handleDeleteImage = async (imageId: string) => {
    const res = await fetch(
      `/api/admin/store-items/${id}/images?imageId=${imageId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image deleted");
    }
  };

  /* ---- Options (flat list, backed by a single auto-created group) ---- */

  const ensureDefaultGroup = async (): Promise<string | null> => {
    if (defaultGroupId) return defaultGroupId;

    const res = await fetch(`/api/admin/store-items/${id}/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Options", sort_order: 0 }),
    });

    if (!res.ok) {
      toast.error("Failed to initialise options");
      return null;
    }

    const group = await res.json();
    setDefaultGroupId(group.id);
    return group.id;
  };

  const handleAddOption = async () => {
    const label = newOptionLabel.trim();
    if (!label) return;

    const groupId = await ensureDefaultGroup();
    if (!groupId) return;

    const price_delta = parseFloat(newOptionPrice) || 0;

    const res = await fetch(`/api/admin/store-items/${id}/options/choices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        option_group_id: groupId,
        label,
        price_delta,
        sort_order: options.length,
      }),
    });

    if (res.ok) {
      const choice = await res.json();
      setOptions((prev) => [...prev, choice]);
      setNewOptionLabel("");
      setNewOptionPrice("0");
      toast.success("Option added");
    } else {
      toast.error("Failed to add option");
    }
  };

  const handleDeleteOption = async (choiceId: string) => {
    const res = await fetch(
      `/api/admin/store-items/${id}/options/choices?choiceId=${choiceId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setOptions((prev) => prev.filter((o) => o.id !== choiceId));
      toast.success("Option deleted");
    }
  };

  const updateOptionLocal = (
    choiceId: string,
    updates: Partial<StoreOptionChoice>
  ) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === choiceId ? { ...o, ...updates } : o))
    );
  };

  const handleUpdateOption = async (
    choiceId: string,
    updates: Partial<
      Pick<StoreOptionChoice, "label" | "price_delta" | "is_active">
    >
  ) => {
    updateOptionLocal(choiceId, updates);

    const res = await fetch(`/api/admin/store-items/${id}/options/choices`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: choiceId, ...updates }),
    });

    if (!res.ok) {
      toast.error("Failed to update option");
    }
  };

  if (loading) {
    return (
      <p className="py-12 text-center text-muted-foreground">Loading...</p>
    );
  }

  if (!item) {
    return (
      <p className="py-12 text-center text-muted-foreground">Item not found.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/store">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Edit Store Item</h1>
        </div>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive">Are you sure?</span>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Yes, Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={item.title}
                onChange={(e) =>
                  setItem((prev) =>
                    prev ? { ...prev, title: e.target.value } : prev
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={item.slug}
                onChange={(e) =>
                  setItem((prev) =>
                    prev ? { ...prev, slug: e.target.value } : prev
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={item.description_short}
                onChange={(e) =>
                  setItem((prev) =>
                    prev
                      ? { ...prev, description_short: e.target.value }
                      : prev
                  )
                }
                placeholder="Brief one-liner"
              />
            </div>
            <div className="space-y-2">
              <Label>Long Description</Label>
              <Textarea
                value={item.description_long}
                onChange={(e) =>
                  setItem((prev) =>
                    prev
                      ? { ...prev, description_long: e.target.value }
                      : prev
                  )
                }
                rows={4}
                placeholder="Full item description..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pricing & Visibility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.base_price}
                onChange={(e) =>
                  setItem((prev) =>
                    prev
                      ? {
                          ...prev,
                          base_price: parseFloat(e.target.value) || 0,
                        }
                      : prev
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select
                value={item.availability_state}
                onChange={(e) =>
                  setItem((prev) =>
                    prev
                      ? {
                          ...prev,
                          availability_state: e.target
                            .value as AvailabilityState,
                        }
                      : prev
                  )
                }
              >
                {(
                  Object.entries(AVAILABILITY_LABELS) as [
                    AvailabilityState,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.is_visible}
                onChange={(e) =>
                  setItem((prev) =>
                    prev ? { ...prev, is_visible: e.target.checked } : prev
                  )
                }
                className="h-4 w-4 rounded border-input"
              />
              Visible in store
            </label>

            <Separator />

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Item"}
            </Button>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Images ({images.length})
            </CardTitle>
            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          </CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <ImageIcon className="h-8 w-8" />
                <p className="text-sm">No images yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img) => (
                  <div key={img.id} className="group relative">
                    <img
                      src={img.url}
                      alt={img.alt_text ?? ""}
                      className="h-24 w-full rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute right-1 top-1 rounded bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-2 rounded bg-muted px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={option.is_active}
                      onChange={() =>
                        handleUpdateOption(option.id, {
                          is_active: !option.is_active,
                        })
                      }
                      title={option.is_active ? "Available" : "Unavailable"}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        updateOptionLocal(option.id, {
                          label: e.target.value,
                        })
                      }
                      onBlur={(e) =>
                        handleUpdateOption(option.id, {
                          label: e.target.value,
                        })
                      }
                      className={`h-7 flex-1 text-sm ${
                        option.is_active
                          ? ""
                          : "text-muted-foreground line-through"
                      }`}
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        +$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={option.price_delta}
                        onChange={(e) =>
                          updateOptionLocal(option.id, {
                            price_delta: parseFloat(e.target.value) || 0,
                          })
                        }
                        onBlur={(e) =>
                          handleUpdateOption(option.id, {
                            price_delta: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-7 w-20 text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => handleDeleteOption(option.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {options.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No options yet. Add options below to let customers pick
                variants.
              </p>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Add Option</Label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Option name (e.g. Red, Large)"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddOption();
                  }}
                  className="flex-1"
                />
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-muted-foreground">+$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newOptionPrice}
                    onChange={(e) => setNewOptionPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddOption();
                    }}
                    className="w-24"
                  />
                </div>
                <Button
                  onClick={handleAddOption}
                  disabled={!newOptionLabel.trim()}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
