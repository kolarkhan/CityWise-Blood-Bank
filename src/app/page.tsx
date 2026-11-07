import Link from "next/link";
import { ArrowRight, Building2, Droplets, HeartPulse, Siren } from "lucide-react";
import type React from "react";

import {
  AdminHomeSections,
  BankAdminHomeSections,
  DonorHomeSections,
  PublicHomeSections,
  ReceiverHomeSections,
} from "@/components/home/role-sections";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { TopbarCommunication } from "@/components/layout/topbar-communication";
import { ProfileMenu } from "@/components/profile-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getDonorEligibility } from "@/lib/donor";
import {
  getAdminDashboardData,
  getBankInventoryExpirySummary,
  getBankDashboardData,
  getCityEmergencyOpenCount,
  getCityOpenRequestCount,
  getCityRequestHighlights,
  getDonorDashboardData,
  getLandingAvailableDonors,
  getLandingBanksWithStock,
  getLandingStats,
  getReceiverDashboardData,
} from "@/lib/dashboard-data";
import { UserRole } from "@/lib/enums";
import { getDefaultDashboardPath } from "@/lib/routes";

export default async function LandingPage() {
  const currentUser = await getCurrentUser();
  const role = (currentUser?.role ?? null) as UserRole | null;
  const currentUserId = currentUser?._id?.toString() ?? null;
  const isReceiverView = role === "RECEIVER" || role === "HOSPITAL";
  const isDonorView = role === "DONOR";
  const isBankView = role === "BLOOD_BANK_ADMIN";
  const isAdminView = role === "SUPER_ADMIN" || role === "CITY_ADMIN";
  const currentUserCity = currentUser?.city ?? null;
  const currentUserBloodGroup = currentUser?.bloodGroup ?? null;
  const donorEligibility = getDonorEligibility(
    currentUser?.lastDonationDate ? new Date(currentUser.lastDonationDate) : null,
  );

  const [
    stats,
    donors,
    banksWithStock,
    donorData,
    receiverData,
    bankData,
    adminData,
    receiverCityRequestHighlights,
    receiverCityOpenCount,
    receiverCityEmergencyCount,
    donorMatchingRequestHighlights,
    donorEmergencyAlertsCount,
    bankExpirySummary,
  ] = await Promise.all([
    getLandingStats(),
    getLandingAvailableDonors(12, currentUserId),
    getLandingBanksWithStock(),
    role === "DONOR" && currentUserId ? getDonorDashboardData(currentUserId) : Promise.resolve(null),
    role && ["RECEIVER", "HOSPITAL"].includes(role) && currentUserId
      ? getReceiverDashboardData(currentUserId)
      : Promise.resolve(null),
    role === "BLOOD_BANK_ADMIN" && currentUserId ? getBankDashboardData(currentUserId) : Promise.resolve(null),
    role && ["SUPER_ADMIN", "CITY_ADMIN"].includes(role)
      ? getAdminDashboardData(role, currentUser?.city)
      : Promise.resolve(null),
    isReceiverView ? getCityRequestHighlights({ city: currentUserCity, limit: 6 }) : Promise.resolve([]),
    isReceiverView ? getCityOpenRequestCount({ city: currentUserCity }) : Promise.resolve(0),
    isReceiverView ? getCityEmergencyOpenCount({ city: currentUserCity }) : Promise.resolve(0),
    isDonorView
      ? getCityRequestHighlights({
          city: currentUserCity,
          bloodGroup: currentUserBloodGroup,
          limit: 6,
        })
      : Promise.resolve([]),
    isDonorView
      ? getCityEmergencyOpenCount({
          city: currentUserCity,
          bloodGroup: currentUserBloodGroup,
        })
      : Promise.resolve(0),
    isBankView && currentUserId ? getBankInventoryExpirySummary(currentUserId) : Promise.resolve(null),
  ]);
  const pageLayoutClass = currentUser
    ? "min-h-screen bg-gradient-to-b from-red-50 via-white to-slate-100 lg:grid lg:grid-cols-[18rem_1fr]"
    : "min-h-screen bg-gradient-to-b from-red-50 via-white to-slate-100";

  return (
    <div className={pageLayoutClass}>
      {currentUser ? <DashboardSidebar role={currentUser.role as UserRole} pathname="/" /> : null}

      <main>
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
            <div>
              <p className="text-sm text-slate-500">Current role</p>
              <Badge variant={currentUser ? "info" : "default"}>
                {currentUser ? currentUser.role : "PUBLIC"}
              </Badge>
            </div>
            <div className="inline-flex items-center gap-2">
              {currentUser ? (
                <>
                  <div className="mr-1 border-r border-slate-200 pr-3">
                    <TopbarCommunication currentUserId={currentUser._id.toString()} />
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
                    <p className="text-xs text-slate-500">{currentUser.city ?? "City not set"}</p>
                  </div>
                  <ProfileMenu
                    name={currentUser.name}
                    city={currentUser.city}
                    dashboardPath={getDefaultDashboardPath(currentUser.role as UserRole)}
                  />
                </>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button variant="outline">Login</Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button>Join Platform</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-10 md:grid-cols-2 md:px-8">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-red-600">
              City-wise Donor + Blood Bank Matching
            </p>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              Fast, verified blood access for patients, hospitals, and communities.
            </h1>
            <p className="mt-4 max-w-xl text-slate-600">
              CityWise connects donors, receivers, and verified blood banks with role-based workflows, emergency
              matching, inventory tracking, and admin moderation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/search">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent text-red-700 transition-transform duration-200 will-change-transform hover:scale-105 hover:bg-transparent"
                >
                  Search Blood <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/request/new">
                <Button
                  size="lg"
                  variant="outline"
                  className="transition-transform duration-200 will-change-transform hover:scale-105"
                >
                  Raise Request
                </Button>
              </Link>
            </div>
          </div>

          <Card className="border-red-100 bg-white/90">
            <CardContent className="grid gap-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Stat icon={HeartPulse} label="Registered Donors" value={stats.donors} />
                <Stat icon={Building2} label="Verified Banks" value={stats.banks} />
                <Stat icon={Droplets} label="Total Requests" value={stats.requests} />
                <Stat icon={Siren} label="Open Emergency" value={stats.emergencyOpen} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-8">
          {!currentUser ? (
            <PublicHomeSections
              donors={donors}
              banksWithStock={banksWithStock}
              currentUserId={currentUserId}
              isAuthenticated={Boolean(currentUser)}
            />
          ) : null}

          {isReceiverView ? (
            <ReceiverHomeSections
              role={role}
              donors={donors}
              banksWithStock={banksWithStock}
              currentUserId={currentUserId}
              isAuthenticated={Boolean(currentUser)}
              totalRequests={receiverData?.myRequests ?? 0}
              activeRequests={receiverData?.activeRequests ?? 0}
              completedRequests={receiverData?.completed ?? 0}
              cityOpenRequestsCount={receiverCityOpenCount}
              emergencyRequestsCount={receiverCityEmergencyCount}
              cityRequestHighlights={receiverCityRequestHighlights}
            />
          ) : null}

          {isDonorView ? (
            <DonorHomeSections
              donors={donors}
              banksWithStock={banksWithStock}
              currentUserId={currentUserId}
              isAuthenticated={Boolean(currentUser)}
              openRequests={donorData?.openRequests ?? 0}
              acceptedRequests={donorData?.acceptedRequests ?? 0}
              pendingChats={donorData?.pendingChats ?? 0}
              isAvailable={Boolean(currentUser?.isAvailable)}
              matchingRequests={donorMatchingRequestHighlights}
              emergencyAlertsCount={donorEmergencyAlertsCount}
              nextEligibleDate={donorEligibility.nextEligibleDate?.toISOString() ?? null}
            />
          ) : null}

          {isBankView ? (
            <BankAdminHomeSections
              donors={donors}
              currentUserId={currentUserId}
              isAuthenticated={Boolean(currentUser)}
              inventoryCount={bankData?.inventoryCount ?? 0}
              lowStockCount={bankData?.lowStockCount ?? 0}
              appointmentsPending={bankData?.appointmentsPending ?? 0}
              bankName={bankData?.bank?.name ?? null}
              bankCity={bankData?.bank?.city ?? null}
              isVerified={Boolean(bankData?.bank?.isVerified)}
              expirySummary={
                bankExpirySummary ?? {
                  expiringSoonBatches: 0,
                  expiringSoonUnits: 0,
                  soonestExpiryDate: null,
                }
              }
            />
          ) : null}

          {isAdminView ? (
            <AdminHomeSections
              users={adminData?.users ?? 0}
              pendingBanks={adminData?.pendingBanks ?? 0}
              openRequests={adminData?.openRequests ?? 0}
              lowStock={adminData?.lowStock ?? 0}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-100 text-red-700">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
