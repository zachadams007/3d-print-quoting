import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AVAILABILITY_LABELS,
  type AvailabilityState,
  type StoreItemImage,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, ShoppingBag } from "lucide-react";

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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Print Store | 3D Print Quoting",
};

export default async function StorePage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("store_items")
    .select(
      `*, images:store_item_images(id, storage_path, sort_order, alt_text)`
    )
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const items = (data ?? []).map((item) => ({
    ...item,
    images: ((item.images as unknown[]) ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((img: any) => ({
        ...img,
        url: `${supabaseUrl}/storage/v1/object/public/store-images/${img.storage_path}`,
      })),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Print Store</h1>
            <p className="text-muted-foreground">
              Browse pre-made items available for print or request
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <ShoppingBag className="h-12 w-12" />
            <p className="text-lg">No items in the store yet.</p>
            <Link href="/request">
              <Button variant="outline">Request a Custom Print Instead</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const thumbnail =
                item.images.length > 0 ? item.images[0] : null;

              return (
                <Link
                  key={item.id}
                  href={`/store/${item.slug}`}
                  className="block"
                >
                  <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg">
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                      {thumbnail ? (
                        <img
                          src={thumbnail.url}
                          alt={
                            (thumbnail as StoreItemImage).alt_text ??
                            item.title
                          }
                          className="h-full w-full object-cover object-center transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-12 w-12" />
                        </div>
                      )}
                      <div className="absolute right-2 top-2">
                        <Badge
                          variant={availabilityVariant(
                            item.availability_state as AvailabilityState
                          )}
                        >
                          {
                            AVAILABILITY_LABELS[
                              item.availability_state as AvailabilityState
                            ]
                          }
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h2 className="text-lg font-semibold">{item.title}</h2>
                      {item.description_short && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {item.description_short}
                        </p>
                      )}
                      <p className="mt-3 text-lg font-bold">
                        {formatCurrency(item.base_price)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
