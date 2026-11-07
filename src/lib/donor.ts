import { addDays, isAfter, startOfDay } from "date-fns";

import { DONATION_COOLDOWN_DAYS } from "@/lib/constants";
import { BLOOD_GROUPS } from "@/lib/enums";

const DONOR_PROFILE_PLACEHOLDER_CITIES = new Set(["city not set", "unknown", "not set"]);

type DonorProfileLike = {
  name?: string | null;
  city?: string | null;
  bloodGroup?: string | null;
};

export const DONOR_ONBOARDING_PATH = "/dashboard/donor/profile?onboarding=1";

export function getDonorEligibility(lastDonationDate?: Date | null) {
  if (!lastDonationDate) {
    return { isEligible: true, nextEligibleDate: null as Date | null };
  }

  const nextEligibleDate = addDays(startOfDay(lastDonationDate), DONATION_COOLDOWN_DAYS);
  const isEligible = !isAfter(nextEligibleDate, new Date());
  return { isEligible, nextEligibleDate };
}

export function isDonorProfileComplete(donor: DonorProfileLike) {
  const name = donor.name?.trim() ?? "";
  const city = donor.city?.trim() ?? "";
  const normalizedCity = city.toLowerCase();
  const hasValidBloodGroup = donor.bloodGroup ? BLOOD_GROUPS.includes(donor.bloodGroup as (typeof BLOOD_GROUPS)[number]) : false;

  if (name.length < 2) {
    return false;
  }
  if (city.length < 2 || DONOR_PROFILE_PLACEHOLDER_CITIES.has(normalizedCity)) {
    return false;
  }
  if (!hasValidBloodGroup) {
    return false;
  }

  return true;
}
