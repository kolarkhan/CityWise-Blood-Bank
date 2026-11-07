import { ForbiddenCard } from "@/components/forbidden-card";
import { DonorProfileForm } from "@/components/donor/donor-profile-form";
import { getCurrentUser } from "@/lib/auth";
import { getDonorEligibility, isDonorProfileComplete } from "@/lib/donor";

type PageProps = {
  searchParams: Promise<{ onboarding?: string }>;
};

export default async function DonorProfilePage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DONOR") {
    return <ForbiddenCard message="This page is only available to donors." />;
  }
  const params = await searchParams;

  const eligibility = getDonorEligibility(user.lastDonationDate);
  const onboardingRequired =
    params.onboarding === "1" ||
    !isDonorProfileComplete({ name: user.name, city: user.city, bloodGroup: user.bloodGroup });
  const donor = {
    name: user.name,
    city: user.city,
    address: user.address ?? null,
    bloodGroup: user.bloodGroup ?? null,
    cnic: user.cnic ?? null,
    profileImage: user.profileImage ?? null,
    isAvailable: user.isAvailable,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    lastDonationDate: user.lastDonationDate ? new Date(user.lastDonationDate).toISOString() : null,
    geo: user.geo
      ? {
          lat: typeof user.geo.lat === "number" ? user.geo.lat : null,
          lng: typeof user.geo.lng === "number" ? user.geo.lng : null,
        }
      : null,
  };
  const nextEligibleDate = eligibility.nextEligibleDate
    ? new Date(eligibility.nextEligibleDate).toISOString()
    : null;

  return <DonorProfileForm donor={donor} nextEligibleDate={nextEligibleDate} onboardingRequired={onboardingRequired} />;
}
