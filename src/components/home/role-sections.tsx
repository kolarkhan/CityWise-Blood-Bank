import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock, Droplets, MapPin } from "lucide-react";

import { AvailableBanksFeed } from "@/components/home/available-banks-feed";
import { AvailableDonorsFeed } from "@/components/home/available-donors-feed";
import { StatsCard } from "@/components/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  BankInventoryExpirySummary,
  LandingBankStockCard,
  LandingDonorCard,
  LandingRequestHighlight,
} from "@/lib/dashboard-data";
import type { UserRole } from "@/lib/enums";

export function PublicHomeSections({
  donors,
  banksWithStock,
  isAuthenticated,
  currentUserId,
}: {
  donors: LandingDonorCard[];
  banksWithStock: LandingBankStockCard[];
  isAuthenticated: boolean;
  currentUserId: string | null;
}) {
  return (
    <div className="space-y-14">
      <RoleSectionHeader
        title="Available Donors"
        subtitle="Browse active donors with city and blood group details."
        actionLabel="Open Search"
        actionHref="/search"
      />
      <AvailableDonorsFeed donors={donors} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />

      <RoleSectionHeader
        title="Blood Banks with Available Stock"
        subtitle="Verified blood banks currently holding active units across blood groups."
        actionLabel="Find by City"
        actionHref="/search"
      />
      <AvailableBanksFeed banks={banksWithStock} />
    </div>
  );
}

export function ReceiverHomeSections({
  role,
  donors,
  banksWithStock,
  isAuthenticated,
  currentUserId,
  totalRequests,
  activeRequests,
  completedRequests,
  cityOpenRequestsCount,
  emergencyRequestsCount,
  cityRequestHighlights,
}: {
  role: UserRole | null;
  donors: LandingDonorCard[];
  banksWithStock: LandingBankStockCard[];
  isAuthenticated: boolean;
  currentUserId: string | null;
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  cityOpenRequestsCount: number;
  emergencyRequestsCount: number;
  cityRequestHighlights: LandingRequestHighlight[];
}) {
  const isHospital = role === "HOSPITAL";
  const roleLabel = isHospital ? "Hospital Feed" : "Receiver Feed";
  const totalRequestsLabel = isHospital ? "Hospital Requests" : "Total Requests";
  const activeRequestsLabel = isHospital ? "Active Cases" : "Active Requests";
  const completedRequestsLabel = isHospital ? "Resolved Cases" : "Completed Requests";
  const cityOpenLabel = isHospital ? "City Cases Queue" : "City Open Requests";
  const emergencyLabel = isHospital ? "Critical Nearby" : "Emergency Nearby";
  const primaryCtaLabel = isHospital ? "Raise Hospital Request" : "Raise New Request";
  const secondaryCtaLabel = isHospital ? "Open Case Board" : "View My Requests";
  const requestsSectionTitle = isHospital ? "Critical/Open Cases Near Hospital" : "Emergency/Open Requests Near City";
  const requestsSectionSubtitle = isHospital
    ? "Urgent cases from your city that may need immediate hospital coordination."
    : "Recent urgent and open requests from your city.";
  const donorSectionTitle = isHospital ? "Donor Pool for Hospital Coordination" : "Matching Donors";
  const donorSectionSubtitle = isHospital
    ? "Available donors you can coordinate with for immediate transfusion needs."
    : "Donors available right now for urgent and normal requests.";
  const bankSectionTitle = isHospital ? "Blood Banks for Emergency Sourcing" : "Nearby Blood Banks";
  const bankSectionSubtitle = isHospital
    ? "Verified banks with active stock for fast emergency routing."
    : "Verified banks with available stock and contact details.";

  return (
    <div className="space-y-14">
      <div className="space-y-5">
        <RoleBadgeLabel text={roleLabel} />
        <div className="grid gap-4 md:grid-cols-5">
          <StatsCard title={totalRequestsLabel} value={totalRequests} />
          <StatsCard title={activeRequestsLabel} value={activeRequests} />
          <StatsCard title={completedRequestsLabel} value={completedRequests} />
          <StatsCard title={cityOpenLabel} value={cityOpenRequestsCount} />
          <StatsCard title={emergencyLabel} value={emergencyRequestsCount} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/request/new">
            <Button>{primaryCtaLabel}</Button>
          </Link>
          <Link href="/dashboard/receiver/requests">
            <Button variant="outline">{secondaryCtaLabel}</Button>
          </Link>
          <Link href="/search">
            <Button variant="outline">{isHospital ? "Open Donor Search" : "Search Blood"}</Button>
          </Link>
        </div>
      </div>

      <RoleSectionHeader
        title={requestsSectionTitle}
        subtitle={requestsSectionSubtitle}
        actionLabel="View Requests"
        actionHref="/dashboard/receiver/requests"
      />
      <RequestHighlightsList
        requests={cityRequestHighlights}
        emptyText="No open requests found for your city right now."
      />

      <RoleSectionHeader
        title={donorSectionTitle}
        subtitle={donorSectionSubtitle}
        actionLabel="Search Blood"
        actionHref="/search"
      />
      <AvailableDonorsFeed donors={donors} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />

      <RoleSectionHeader
        title={bankSectionTitle}
        subtitle={bankSectionSubtitle}
        actionLabel="Find by City"
        actionHref="/search"
      />
      <AvailableBanksFeed banks={banksWithStock} />
    </div>
  );
}

export function DonorHomeSections({
  donors,
  banksWithStock,
  isAuthenticated,
  currentUserId,
  openRequests,
  acceptedRequests,
  pendingChats,
  isAvailable,
  matchingRequests,
  emergencyAlertsCount,
  nextEligibleDate,
}: {
  donors: LandingDonorCard[];
  banksWithStock: LandingBankStockCard[];
  isAuthenticated: boolean;
  currentUserId: string | null;
  openRequests: number;
  acceptedRequests: number;
  pendingChats: number;
  isAvailable: boolean;
  matchingRequests: LandingRequestHighlight[];
  emergencyAlertsCount: number;
  nextEligibleDate: string | null;
}) {
  const isInCooldown = !isAvailable && Boolean(nextEligibleDate);
  return (
    <div className="space-y-14">
      <div className="space-y-5">
        <RoleBadgeLabel text="Donor Feed" />
        <div className="grid gap-4 md:grid-cols-5">
          <StatsCard title="Open Requests" value={openRequests} />
          <StatsCard title="Accepted Requests" value={acceptedRequests} />
          <StatsCard title="Pending Chats" value={pendingChats} />
          <StatsCard title="Emergency Alerts" value={emergencyAlertsCount} />
          <StatsCard title="Availability" value={isAvailable ? "Available" : "Not Available"} />
        </div>
        <Card className="border-slate-200 bg-white/95">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-900">Eligibility & cooldown</p>
              <p className="text-sm text-slate-500">
                {isInCooldown && nextEligibleDate
                  ? `Next eligible on ${format(new Date(nextEligibleDate), "PPP")}.`
                  : "You are currently eligible to accept donation requests."}
              </p>
            </div>
            <Badge variant={isInCooldown ? "warning" : "success"}>{isInCooldown ? "COOLDOWN" : "ELIGIBLE"}</Badge>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/donor/requests">
            <Button>Open Requests</Button>
          </Link>
          <Link href="/dashboard/donor/requests">
            <Button variant="outline">Quick Accept & Chat</Button>
          </Link>
          <Link href="/dashboard/donor/history">
            <Button variant="outline">Donation History</Button>
          </Link>
        </div>
      </div>

      <RoleSectionHeader
        title="Matching Requests (City + Blood Group)"
        subtitle="High-priority requests matching your donor profile."
        actionLabel="Donor Requests"
        actionHref="/dashboard/donor/requests"
      />
      <RequestHighlightsList
        requests={matchingRequests}
        emptyText="No matching requests found for your city and blood group right now."
      />

      <RoleSectionHeader
        title="Live Donor Network"
        subtitle="Coordinate with nearby donors for urgent response."
        actionLabel="Open Search"
        actionHref="/search"
      />
      <AvailableDonorsFeed donors={donors} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />

      <RoleSectionHeader
        title="Blood Banks with Available Stock"
        subtitle="Use this when receiver needs bank-level stock urgently."
        actionLabel="Find by City"
        actionHref="/search"
      />
      <AvailableBanksFeed banks={banksWithStock} />
    </div>
  );
}

export function BankAdminHomeSections({
  donors,
  isAuthenticated,
  currentUserId,
  inventoryCount,
  lowStockCount,
  appointmentsPending,
  bankName,
  bankCity,
  isVerified,
  expirySummary,
}: {
  donors: LandingDonorCard[];
  isAuthenticated: boolean;
  currentUserId: string | null;
  inventoryCount: number;
  lowStockCount: number;
  appointmentsPending: number;
  bankName: string | null;
  bankCity: string | null;
  isVerified: boolean;
  expirySummary: BankInventoryExpirySummary;
}) {
  return (
    <div className="space-y-14">
      <div className="space-y-5">
        <RoleBadgeLabel text="Blood Bank Feed" />
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard title="Inventory Items" value={inventoryCount} />
          <StatsCard title="Low Stock Alerts" value={lowStockCount} />
          <StatsCard title="Pending Appointments" value={appointmentsPending} />
        </div>
        <Card className="border-slate-200 bg-white/95">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-900">{bankName ?? "No bank profile submitted yet"}</p>
              <p className="text-sm text-slate-500">{bankCity ?? "Complete profile to activate bank workflows."}</p>
            </div>
            <Badge variant={isVerified ? "success" : "warning"}>
              {isVerified ? "VERIFIED" : "PENDING VERIFICATION"}
            </Badge>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/bank/inventory">
            <Button>Manage Inventory</Button>
          </Link>
          <Link href="/dashboard/bank/profile">
            <Button variant="outline">Manage Profile</Button>
          </Link>
          <Link href="/dashboard/bank/appointments">
            <Button variant="outline">Appointments</Button>
          </Link>
        </div>
      </div>

      <RoleSectionHeader
        title="Expiring Inventory (Next 7 Days)"
        subtitle="Track expiring batches before they become unusable."
        actionLabel="Open Inventory"
        actionHref="/dashboard/bank/inventory"
      />
      <Card className="border-slate-200 bg-white/95">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="font-medium text-slate-900">
              {expirySummary.expiringSoonBatches} batches, {expirySummary.expiringSoonUnits} units expiring soon
            </p>
            <p className="text-sm text-slate-500">
              {expirySummary.soonestExpiryDate
                ? `Closest expiry: ${format(new Date(expirySummary.soonestExpiryDate), "PPP")}`
                : "No inventory expiring in the next 7 days."}
            </p>
          </div>
          <Badge variant={expirySummary.expiringSoonBatches > 0 ? "warning" : "success"}>
            {expirySummary.expiringSoonBatches > 0 ? "ACTION REQUIRED" : "STABLE"}
          </Badge>
        </CardContent>
      </Card>

      <RoleSectionHeader
        title="Available Donor Network"
        subtitle="Reach active donors for coordination and appointment scheduling."
        actionLabel="Open Search"
        actionHref="/search"
      />
      <AvailableDonorsFeed donors={donors} isAuthenticated={isAuthenticated} currentUserId={currentUserId} />
    </div>
  );
}

export function AdminHomeSections({
  users,
  pendingBanks,
  openRequests,
  lowStock,
}: {
  users: number;
  pendingBanks: number;
  openRequests: number;
  lowStock: number;
}) {
  return (
    <div className="space-y-8">
      <RoleBadgeLabel text="Admin Feed" />
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard title="Users" value={users} />
        <StatsCard title="Pending Banks" value={pendingBanks} />
        <StatsCard title="Open Requests" value={openRequests} />
        <StatsCard title="Low Stock Items" value={lowStock} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/admin/users">
          <Button variant="outline">Manage Users</Button>
        </Link>
        <Link href="/dashboard/admin/banks">
          <Button variant="outline">Verify Banks</Button>
        </Link>
        <Link href="/dashboard/admin/requests">
          <Button variant="outline">Moderate Requests</Button>
        </Link>
        <Link href="/dashboard/admin/analytics">
          <Button>View Analytics</Button>
        </Link>
      </div>
    </div>
  );
}

function RoleSectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
      <Link href={actionHref}>
        <Button variant="outline">{actionLabel}</Button>
      </Link>
    </div>
  );
}

function RoleBadgeLabel({ text }: { text: string }) {
  return (
    <Badge variant="info" className="px-3 py-1 text-xs tracking-wide">
      {text}
    </Badge>
  );
}

function RequestHighlightsList({
  requests,
  emptyText,
}: {
  requests: LandingRequestHighlight[];
  emptyText: string;
}) {
  if (!requests.length) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80">
        <CardContent className="p-6 text-sm text-slate-600">{emptyText}</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {requests.map((request) => (
        <Card key={request.id} className="border-slate-200 bg-white/95">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{request.patientName}</p>
              <Badge variant={request.urgency === "EMERGENCY" ? "danger" : "warning"}>{request.urgency}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5" /> {request.bloodGroup}
              </span>
              <span>{request.units} units</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {request.city}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" /> {format(new Date(request.neededByDate), "PPP")}
              </span>
              <Badge variant="info">{request.status}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
