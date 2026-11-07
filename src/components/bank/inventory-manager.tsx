"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BLOOD_GROUPS } from "@/lib/enums";
import { fetchJson } from "@/lib/client";

type InventoryItem = {
  _id: string;
  bloodGroup: string;
  units: number;
  expiryDate: string;
  batchId?: string | null;
  isExpired: boolean;
};

export function InventoryManager({ initialItems, city }: { initialItems: InventoryItem[]; city: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bloodGroup: "A+",
    units: "1",
    expiryDate: "",
    batchId: "",
  });

  const addItem = async () => {
    try {
      setLoading(true);
      await fetchJson("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          bloodGroup: form.bloodGroup,
          units: Number(form.units),
          expiryDate: form.expiryDate,
          batchId: form.batchId || undefined,
        }),
      });
      toast.success("Inventory item added");
      setForm({ bloodGroup: "A+", units: "1", expiryDate: "", batchId: "" });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetchJson(`/api/inventory/${id}`, { method: "DELETE" });
      toast.success("Inventory item removed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove item");
    }
  };

  const runCleanup = async () => {
    try {
      await fetchJson("/api/inventory/cleanup", { method: "POST" });
      toast.success("Expiry cleanup completed");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cleanup failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Inventory Batch</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bloodGroup">Blood Group</Label>
            <Select
              id="bloodGroup"
              value={form.bloodGroup}
              onChange={(event) => setForm((prev) => ({ ...prev, bloodGroup: event.target.value }))}
            >
              {BLOOD_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="units">Units</Label>
            <Input
              id="units"
              type="number"
              value={form.units}
              onChange={(event) => setForm((prev) => ({ ...prev, units: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={form.expiryDate}
              onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="batchId">Batch ID</Label>
            <Input
              id="batchId"
              value={form.batchId}
              onChange={(event) => setForm((prev) => ({ ...prev, batchId: event.target.value }))}
            />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <Button onClick={addItem} disabled={loading}>
              {loading ? "Adding..." : "Add Batch"}
            </Button>
            <Button variant="outline" onClick={runCleanup}>
              Cleanup Expired
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialItems.length ? (
                initialItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>{item.bloodGroup}</TableCell>
                    <TableCell>{item.units}</TableCell>
                    <TableCell>{item.batchId ?? "-"}</TableCell>
                    <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.isExpired ? "EXPIRED" : "ACTIVE"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(item._id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500">
                    No inventory items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
