"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Estimate } from "@/lib/types";
import { AlertTriangle, Clock, Package, DollarSign, Calendar } from "lucide-react";

interface EstimatePanelProps {
  estimate: Estimate | null;
  hasFiles: boolean;
}

export function EstimatePanel({ estimate, hasFiles }: EstimatePanelProps) {
  if (!hasFiles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upload files to see a live estimate.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!estimate || (estimate.totalVolumeCm3 === 0 && estimate.manualRequired)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-yellow-600">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="text-sm">
                Manual estimate required — we&apos;ll review your files and
                provide a quote.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              You can also try uploading a different file type or a newly
              exported/downloaded file.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Live Estimate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {estimate.manualRequired && (
          <div className="rounded-md bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Some files need manual review. Estimate is partial.
            </div>
            <p className="mt-1 text-yellow-600 dark:text-yellow-400">
              You can also try uploading a different file type or a newly
              exported/downloaded file.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          <Row
            icon={<Package className="h-4 w-4" />}
            label="Est. Volume"
            value={`${formatNumber(estimate.totalVolumeCm3)} cm³`}
          />
          <Row
            icon={<Package className="h-4 w-4" />}
            label="Est. Grams"
            value={`${formatNumber(estimate.grams)} g`}
          />
          <Row
            icon={<Clock className="h-4 w-4" />}
            label="Est. Print Time"
            value={`${formatNumber(estimate.timeHours, 1)} hrs`}
          />
          <Row
            icon={<Calendar className="h-4 w-4" />}
            label="Est. Turnaround"
            value={`${estimate.turnaroundDays} day${estimate.turnaroundDays !== 1 ? "s" : ""}`}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <DollarSign className="h-4 w-4" />
            Est. Price
          </div>
          <span className="text-xl font-bold">
            {formatCurrency(estimate.price)}
          </span>
        </div>

        {estimate.minimumApplied && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Minimum price applied: {formatCurrency(estimate.minimumPrice)}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Estimate only — accuracy can vary, especially for large or complex
          prints. Final price confirmed by chat.
        </p>
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="font-medium">{value}</span>
    </div>
  );
}
