"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  REQUEST_STATUS_LABELS,
  type RequestStatus,
  type PrintRequest,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

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

export default function AdminDashboard() {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const perPage = 20;

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/requests?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.data ?? []);
      setCount(data.count ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const totalPages = Math.ceil(count / perPage);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Print Requests</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or ID..."
            className="w-64 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {Object.entries(REQUEST_STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">
          {count} request{count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Est. Price</TableHead>
              <TableHead className="text-right">Final</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(r.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.customer_name}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.customer_email}
                  </TableCell>
                  <TableCell>
                    {r.request_source === "store" ? (
                      <Badge variant="secondary">
                        Store{r.store_items?.title ? `: ${r.store_items.title}` : ""}
                      </Badge>
                    ) : (
                      <span>{r.materials?.name ?? "Upload"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>
                      {REQUEST_STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.estimated_price != null
                      ? formatCurrency(r.estimated_price)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {r.final_price != null
                      ? formatCurrency(r.final_price)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/requests/${r.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
