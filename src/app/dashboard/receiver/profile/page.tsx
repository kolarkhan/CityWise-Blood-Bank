import { ForbiddenCard } from "@/components/forbidden-card";
import { HospitalProfileForm } from "@/components/hospital/hospital-profile-form";
import { ReceiverProfileForm } from "@/components/receiver/receiver-profile-form";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/models/user";

export default async function HospitalProfilePage() {
  const user = await getCurrentUser();
  if (!user || !["RECEIVER", "HOSPITAL"].includes(user.role)) {
    return <ForbiddenCard message="This profile page is available to receivers and hospitals." />;
  }

  await connectToDatabase();
  const profile = await UserModel.findById(user._id)
    .select("name city address phone email profileImage coverImage geo")
    .lean();
  if (!profile) {
    return <ForbiddenCard message="Hospital profile not found." />;
  }

  if (user.role === "RECEIVER") {
    return (
      <ReceiverProfileForm
        initial={{
          name: profile.name,
          city: profile.city,
          phone: profile.phone,
          email: profile.email,
          profileImage: profile.profileImage ?? null,
        }}
      />
    );
  }

  return (
    <HospitalProfileForm
      initial={{
        name: profile.name,
        city: profile.city,
        address: profile.address ?? "",
        phone: profile.phone,
        email: profile.email,
        profileImage: profile.profileImage ?? null,
        coverImage: profile.coverImage ?? null,
        geo: profile.geo
          ? {
              lat: typeof profile.geo.lat === "number" ? profile.geo.lat : null,
              lng: typeof profile.geo.lng === "number" ? profile.geo.lng : null,
            }
          : null,
      }}
    />
  );
}
