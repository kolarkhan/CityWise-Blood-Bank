import { UserRole } from "@/lib/enums";

type RoleConfig = {
  pathPrefix: string;
  roles: UserRole[];
};

export const dashboardAccessRules: RoleConfig[] = [
  {
    pathPrefix: "/dashboard/donor",
    roles: ["DONOR"],
  },
  {
    pathPrefix: "/dashboard/receiver",
    roles: ["RECEIVER", "HOSPITAL"],
  },
  {
    pathPrefix: "/dashboard/bank",
    roles: ["BLOOD_BANK_ADMIN"],
  },
  {
    pathPrefix: "/dashboard/admin",
    roles: ["SUPER_ADMIN", "CITY_ADMIN"],
  },
];

export function getDefaultDashboardPath(role: UserRole) {
  switch (role) {
    case "DONOR":
      return "/dashboard/donor";
    case "RECEIVER":
    case "HOSPITAL":
      return "/dashboard/receiver";
    case "BLOOD_BANK_ADMIN":
      return "/dashboard/bank";
    case "CITY_ADMIN":
    case "SUPER_ADMIN":
      return "/dashboard/admin";
    default:
      return "/";
  }
}
