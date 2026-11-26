import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_DESCRIPTIONS,
  type AvailabilityState,
  type StoreOptionChoice,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { StoreRequestForm } from "@/components/store-request-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `${slug} | Print Store` };
}

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

export default async function StoreItemPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from("store_items")
    .select(
      `*,
      images:store_item_images(id, storage_path, sort_order, alt_text),
      option_groups:store_item_option_groups(
        id, name, sort_order,
        choices:store_item_option_choices(id, label, price_delta, sort_order, is_active)
      )`
    )
    .eq("slug", slug)
    .eq("is_visible", true)
    .single();

  if (!item) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const images = ((item.images as unknown[]) ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((img: any) => ({
      ...img,
      url: `${supabaseUrl}/storage/v1/object/public/store-images/${img.storage_path}`,
    }));

  const options: StoreOptionChoice[] = ((item.option_groups as any[]) ?? [])
    .flatMap((g: any) => g.choices ?? [])
    .filter((c: any) => c.is_active)
    .sort((a: any, b: any) => a.sort_order - b.sort_order);

  const availability = item.availability_state as AvailabilityState;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/store">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            Back to Store
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Images */}
          <div>
            {images.length > 0 ? (
              <div className="space-y-3">
                {images.map((img: any, i: number) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt={img.alt_text ?? (i === 0 ? item.title : "")}
                    className="max-h-[400px] max-w-full rounded-lg border"
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {/* Right: Details + Form */}
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Badge variant={availabilityVariant(availability)}>
                  {AVAILABILITY_LABELS[availability]}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold">{item.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {AVAILABILITY_DESCRIPTIONS[availability]}
              </p>
            </div>

            <p className="text-3xl font-bold">
              {formatCurrency(item.base_price)}
            </p>

            {item.description_long && (
              <>
                <Separator />
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-line">{item.description_long}</p>
                </div>
              </>
            )}

            <Separator />

            <Card>
              <CardContent className="pt-6">
                <StoreRequestForm
                  itemId={item.id}
                  itemTitle={item.title}
                  basePrice={item.base_price}
                  options={options}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
