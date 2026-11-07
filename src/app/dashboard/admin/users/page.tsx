import { ForbiddenCard } from "@/components/forbidden-card";
import { AdminUsersTable } from "@/components/admin/users-table";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/models/user";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || !["SUPER_ADMIN", "CITY_ADMIN"].includes(user.role)) {
    return <ForbiddenCard message="This page is available to admins only." />;
  }

  await connectToDatabase();
  const filters = user.role === "CITY_ADMIN" ? { city: user.city } : {};
  const users = await UserModel.find(filters).select("-passwordHash").sort({ createdAt: -1 }).limit(200).lean();

  return (
    <AdminUsersTable
      users={users.map((item) => ({
        _id: item._id.toString(),
        name: item.name,
        email: item.email,
        role: item.role,
        city: item.city,
        isBlocked: item.isBlocked,
      }))}
    />
  );
}
