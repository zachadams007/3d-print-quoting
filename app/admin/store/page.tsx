"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AVAILABILITY_LABELS,
  type StoreItem,
  type AvailabilityState,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Eye, EyeOff } from "lucide-react";

function availabilityVariant(
  state: AvailabilityState
): "default" | "secondary" | "success" | "warning" {
  switch (state) {
    case "in_stock":
      return "success";
    case "made_to_order":
      return "default";
    case "request_only":
      return "warning";
  }
}

export default function AdminStorePage() {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");

  useEffect(() => {
    fetch("/api/admin/store-items")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const handleCreate = async () => {
    const title = newItemTitle.trim();
    if (!title) return;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const res = await fetch("/api/admin/store-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, slug }),
    });

    if (res.ok) {
      const item = await res.json();
      setItems((prev) => [{ ...item, images: [] }, ...prev]);
      setNewItemTitle("");
      setShowNewItem(false);
      toast.success("Store item created");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Store Items</h1>
        {showNewItem ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              placeholder="Item title"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") {
                  setShowNewItem(false);
                  setNewItemTitle("");
                }
              }}
              className="w-56"
            />
            <Button onClick={handleCreate} disabled={!newItemTitle.trim()}>
              Create
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowNewItem(false);
                setNewItemTitle("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowNewItem(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No store items yet. Click &quot;Add Item&quot; to create one.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].url}
                        alt={item.title}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.slug}
                  </TableCell>
                  <TableCell>{formatCurrency(item.base_price)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={availabilityVariant(item.availability_state)}
                    >
                      {AVAILABILITY_LABELS[item.availability_state]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.is_visible ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/store/${item.id}`}>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
