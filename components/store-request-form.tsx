"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoreOptionChoice, StoreOptionsSelected } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  itemId: string;
  itemTitle: string;
  basePrice: number;
  options: StoreOptionChoice[];
}

export function StoreRequestForm({
  itemId,
  itemTitle,
  basePrice,
  options,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [snapchat, setSnapchat] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set()
  );

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPrice = useMemo(() => {
    let total = basePrice;
    for (const option of options) {
      if (selectedOptions.has(option.id)) {
        total += option.price_delta;
      }
    }
    return total;
  }, [basePrice, options, selectedOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    setSubmitting(true);

    const storeOptionsJson: StoreOptionsSelected = {};
    for (const option of options) {
      if (selectedOptions.has(option.id)) {
        storeOptionsJson[option.id] = {
          group_name: "Options",
          choice_id: option.id,
          choice_label: option.label,
          price_delta: option.price_delta,
        };
      }
    }

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_source: "store",
          customer_name: name.trim(),
          customer_email: email.trim(),
          customer_snapchat: snapchat.trim() || null,
          customer_notes: notes.trim() || null,
          store_item_id: itemId,
          store_options_json: storeOptionsJson,
          estimated_price: totalPrice,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-semibold">
        Request &ldquo;{itemTitle}&rdquo;
      </h3>

      {options.length > 0 && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const selected = selectedOptions.has(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(option.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {option.label}
                  {option.price_delta !== 0 && (
                    <span className="ml-1.5 text-xs opacity-80">
                      {option.price_delta > 0 ? "+" : ""}
                      {formatCurrency(option.price_delta)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-md bg-muted p-3 text-center">
        <p className="text-xs text-muted-foreground">Estimated Price</p>
        <p className="text-2xl font-bold">{formatCurrency(totalPrice)}</p>
        <p className="text-xs text-muted-foreground">
          Final price confirmed by chat
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="store-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="store-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="store-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="store-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="store-snapchat">Snapchat Username (optional)</Label>
        <Input
          id="store-snapchat"
          value={snapchat}
          onChange={(e) => setSnapchat(e.target.value)}
          placeholder="your_snapchat"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="store-notes">Notes (optional)</Label>
        <Textarea
          id="store-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special requests, questions, etc."
          rows={3}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  );
}
