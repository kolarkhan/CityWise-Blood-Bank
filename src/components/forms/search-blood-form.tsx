"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { detectCityFromCurrentLocation } from "@/lib/geo-client";
import { BLOOD_GROUPS } from "@/lib/enums";
import { fetchJson } from "@/lib/client";

type SearchResult = {
  donors: {
    id: string;
    displayName: string;
    city: string;
    bloodGroup: string;
  }[];
  banks: {
    bankId: string;
    name: string;
    city: string;
    address: string;
    contactPhone: string;
    availableUnits: number;
  }[];
};

export function SearchBloodForm() {
  const [city, setCity] = useState("");
  const [bloodGroup, setBloodGroup] = useState<(typeof BLOOD_GROUPS)[number]>("A+");
  const [loading, setLoading] = useState(false);
  const [detectingCity, setDetectingCity] = useState(false);
  const [data, setData] = useState<SearchResult | null>(null);

  const autoFillCity = async (silent = false) => {
    try {
      setDetectingCity(true);
      const detected = await detectCityFromCurrentLocation();
      setCity(detected.city);
      if (!silent) {
        toast.success(`City detected: ${detected.city}`);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : "Unable to detect city");
      }
    } finally {
      setDetectingCity(false);
    }
  };

  useEffect(() => {
    if (!city) {
      void autoFillCity(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      const result = await fetchJson<SearchResult>(
        `/api/search?city=${encodeURIComponent(city)}&bloodGroup=${encodeURIComponent(bloodGroup)}`,
      );
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Blood by City</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="city">City</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={autoFillCity}
                  disabled={detectingCity}
                >
                  {detectingCity ? "Detecting..." : "Auto Fill City"}
                </Button>
              </div>
              <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Select
                id="bloodGroup"
                value={bloodGroup}
                onChange={(event) => setBloodGroup(event.target.value as (typeof BLOOD_GROUPS)[number])}
              >
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matching Donors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Blood Group</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.donors?.length ? (
                data.donors.map((donor) => (
                  <TableRow key={donor.id}>
                    <TableCell>{donor.displayName}</TableCell>
                    <TableCell>{donor.city}</TableCell>
                    <TableCell>{donor.bloodGroup}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-slate-500">
                    No donors to display.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blood Banks with Available Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.banks?.length ? (
                data.banks.map((bank) => (
                  <TableRow key={bank.bankId}>
                    <TableCell>{bank.name}</TableCell>
                    <TableCell>{bank.city}</TableCell>
                    <TableCell>{bank.availableUnits}</TableCell>
                    <TableCell>{bank.contactPhone}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500">
                    No blood bank stock to display.
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
