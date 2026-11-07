import Image from "next/image";
import { Building2, Droplets, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LandingBankStockCard } from "@/lib/dashboard-data";

export function AvailableBanksFeed({ banks }: { banks: LandingBankStockCard[] }) {
  if (!banks.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-slate-600">No verified blood bank stock available right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {banks.map((bank) => {
        const hasGeo = typeof bank.geo?.lat === "number" && typeof bank.geo?.lng === "number";
        const query = hasGeo
          ? `${bank.geo?.lat},${bank.geo?.lng}`
          : `${bank.name}, ${bank.address}, ${bank.city}`;
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

        return (
          <Card
            key={bank.bankId}
            className="border-slate-200 bg-white/95 transition-transform duration-200 will-change-transform hover:scale-[1.02]"
          >
            <CardContent className="space-y-3 p-0">
              <div className="relative overflow-hidden rounded-t-xl">
                {bank.coverImage ? (
                  <Image
                    src={bank.coverImage}
                    alt={`${bank.name} cover`}
                    width={800}
                    height={220}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="h-28 w-full bg-gradient-to-r from-red-100 via-rose-50 to-orange-100" />
                )}
                <div className="absolute bottom-2 left-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-red-700">
                  <Droplets className="h-3.5 w-3.5" />
                  {bank.totalUnits} units
                </div>
              </div>

              <div className="space-y-3 p-5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white">
                    {bank.profileImage ? (
                      <Image src={bank.profileImage} alt={`${bank.name} logo`} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Building2 className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{bank.name}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                      <Building2 className="h-3.5 w-3.5" /> {bank.city}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">Available blood groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bank.availableGroups.slice(0, 6).map((group) => (
                      <Badge key={`${bank.bankId}:${group}`} variant="outline">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>

                <p className="inline-flex items-center gap-1 text-xs text-slate-600">
                  <Phone className="h-3.5 w-3.5" /> {bank.contactPhone}
                </p>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 hover:underline"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Open in Google Maps
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
