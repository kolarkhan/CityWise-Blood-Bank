import { connectToDatabase } from "@/lib/db";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { UserRole } from "@/lib/enums";
import { AppointmentModel } from "@/models/appointment";
import { BloodBankModel } from "@/models/blood-bank";
import { ConversationModel } from "@/models/conversation";
import { DonorReactionModel } from "@/models/donor-reaction";
import { DonationRequestModel } from "@/models/donation-request";
import { InventoryModel } from "@/models/inventory";
import { MessageModel } from "@/models/message";
import { NotificationModel } from "@/models/notification";
import { UserModel } from "@/models/user";
import { Types } from "mongoose";

export async function getLandingStats() {
  try {
    await connectToDatabase();
    const [donors, banks, requests, emergencyOpen] = await Promise.all([
      UserModel.countDocuments({ role: "DONOR", isBlocked: false }),
      BloodBankModel.countDocuments({ isVerified: true }),
      DonationRequestModel.countDocuments(),
      DonationRequestModel.countDocuments({ urgency: "EMERGENCY", status: { $in: ["OPEN", "MATCHING"] } }),
    ]);

    return { donors, banks, requests, emergencyOpen };
  } catch {
    return { donors: 0, banks: 0, requests: 0, emergencyOpen: 0 };
  }
}

export type LandingDonorCard = {
  id: string;
  name: string;
  city: string;
  bloodGroup: string;
  likes: number;
  dislikes: number;
  reaction: 1 | -1 | 0;
};

export type LandingBankStockCard = {
  bankId: string;
  name: string;
  city: string;
  address: string;
  contactPhone: string;
  totalUnits: number;
  availableGroups: string[];
  profileImage?: string | null;
  coverImage?: string | null;
  geo?: {
    lat: number | null;
    lng: number | null;
  } | null;
};

export type LandingRequestHighlight = {
  id: string;
  patientName: string;
  bloodGroup: string;
  units: number;
  city: string;
  urgency: "NORMAL" | "EMERGENCY";
  status: "OPEN" | "MATCHING" | "ACCEPTED" | "SCHEDULED" | "COMPLETED" | "CANCELLED";
  neededByDate: string;
};

export type BankInventoryExpirySummary = {
  expiringSoonBatches: number;
  expiringSoonUnits: number;
  soonestExpiryDate: string | null;
};

export async function getLandingAvailableDonors(
  limit = 12,
  viewerUserId?: string | null,
): Promise<LandingDonorCard[]> {
  try {
    await connectToDatabase();
    const donors = await UserModel.find({
      role: "DONOR",
      isBlocked: false,
      isAvailable: true,
      bloodGroup: { $ne: null },
    })
      .select("name city bloodGroup")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    if (!donors.length) {
      return [];
    }

    const donorObjectIds = donors.map((donor) => donor._id);
    const donorIdStrings = donors.map((donor) => donor._id.toString());

    const reactionCounts = await DonorReactionModel.aggregate<{
      donorId: Types.ObjectId;
      likes: number;
      dislikes: number;
    }>([
      { $match: { donorId: { $in: donorObjectIds } } },
      {
        $group: {
          _id: "$donorId",
          likes: { $sum: { $cond: [{ $eq: ["$reaction", 1] }, 1, 0] } },
          dislikes: { $sum: { $cond: [{ $eq: ["$reaction", -1] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          donorId: "$_id",
          likes: 1,
          dislikes: 1,
        },
      },
    ]);

    const countsByDonorId = new Map(
      reactionCounts.map((row) => [row.donorId.toString(), { likes: row.likes, dislikes: row.dislikes }]),
    );

    let viewerReactionsByDonorId = new Map<string, 1 | -1>();
    if (viewerUserId && Types.ObjectId.isValid(viewerUserId)) {
      const viewerReactions = await DonorReactionModel.find({
        userId: new Types.ObjectId(viewerUserId),
        donorId: { $in: donorObjectIds },
      })
        .select("donorId reaction")
        .lean();

      viewerReactionsByDonorId = new Map(
        viewerReactions
          .map((row) => [row.donorId.toString(), row.reaction] as const)
          .filter((entry): entry is [string, 1 | -1] => entry[1] === 1 || entry[1] === -1),
      );
    }

    return donors.map((donor) => ({
      id: donor._id.toString(),
      name: donor.name,
      city: donor.city,
      bloodGroup: donor.bloodGroup ?? "-",
      likes: countsByDonorId.get(donor._id.toString())?.likes ?? 0,
      dislikes: countsByDonorId.get(donor._id.toString())?.dislikes ?? 0,
      reaction: viewerReactionsByDonorId.get(donor._id.toString()) ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getCityRequestHighlights({
  city,
  bloodGroup,
  limit = 6,
}: {
  city?: string | null;
  bloodGroup?: string | null;
  limit?: number;
}): Promise<LandingRequestHighlight[]> {
  if (!city?.trim()) {
    return [];
  }

  try {
    await connectToDatabase();
    const query: {
      city: string;
      status: { $in: ["OPEN", "MATCHING"] };
      bloodGroup?: string;
    } = {
      city: city.trim(),
      status: { $in: ["OPEN", "MATCHING"] },
    };
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    const requests = await DonationRequestModel.find(query)
      .select("patientName bloodGroup units city urgency status neededByDate createdAt")
      .sort({ createdAt: -1 })
      .limit(Math.max(limit * 3, limit))
      .lean();

    const prioritized = requests
      .sort((a, b) => {
        if (a.urgency !== b.urgency) {
          return a.urgency === "EMERGENCY" ? -1 : 1;
        }
        return new Date(a.neededByDate).getTime() - new Date(b.neededByDate).getTime();
      })
      .slice(0, limit);

    return prioritized.map((request) => ({
      id: request._id.toString(),
      patientName: request.patientName,
      bloodGroup: request.bloodGroup,
      units: request.units,
      city: request.city,
      urgency: request.urgency,
      status: request.status,
      neededByDate: request.neededByDate.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function getCityEmergencyOpenCount({
  city,
  bloodGroup,
}: {
  city?: string | null;
  bloodGroup?: string | null;
}): Promise<number> {
  if (!city?.trim()) {
    return 0;
  }

  try {
    await connectToDatabase();
    const query: {
      city: string;
      urgency: "EMERGENCY";
      status: { $in: ["OPEN", "MATCHING"] };
      bloodGroup?: string;
    } = {
      city: city.trim(),
      urgency: "EMERGENCY",
      status: { $in: ["OPEN", "MATCHING"] },
    };
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }
    return DonationRequestModel.countDocuments(query);
  } catch {
    return 0;
  }
}

export async function getCityOpenRequestCount({
  city,
  bloodGroup,
}: {
  city?: string | null;
  bloodGroup?: string | null;
}): Promise<number> {
  if (!city?.trim()) {
    return 0;
  }

  try {
    await connectToDatabase();
    const query: {
      city: string;
      status: { $in: ["OPEN", "MATCHING"] };
      bloodGroup?: string;
    } = {
      city: city.trim(),
      status: { $in: ["OPEN", "MATCHING"] },
    };
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }
    return DonationRequestModel.countDocuments(query);
  } catch {
    return 0;
  }
}

export async function getLandingBanksWithStock(limit = 8): Promise<LandingBankStockCard[]> {
  try {
    await connectToDatabase();
    const rows = await InventoryModel.aggregate<{
      _id: string;
      totalUnits: number;
      groups: string[];
      bank: {
        _id: string;
        name: string;
        city: string;
        address: string;
        contactPhone: string;
        profileImage?: string | null;
        coverImage?: string | null;
        geo?: {
          lat?: number | null;
          lng?: number | null;
        } | null;
      }[];
    }>([
      {
        $match: {
          units: { $gt: 0 },
          isExpired: false,
        },
      },
      {
        $group: {
          _id: "$bankId",
          totalUnits: { $sum: "$units" },
          groups: { $addToSet: "$bloodGroup" },
        },
      },
      { $sort: { totalUnits: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "bloodbanks",
          localField: "_id",
          foreignField: "_id",
          as: "bank",
        },
      },
      { $unwind: "$bank" },
      { $match: { "bank.isVerified": true } },
      {
        $project: {
          _id: 1,
          totalUnits: 1,
          groups: 1,
          bank: {
            _id: "$bank._id",
            name: "$bank.name",
            city: "$bank.city",
            address: "$bank.address",
            contactPhone: "$bank.contactPhone",
            profileImage: "$bank.profileImage",
            coverImage: "$bank.coverImage",
            geo: "$bank.geo",
          },
        },
      },
    ]);

    return rows.map((item) => ({
      bankId: item.bank._id.toString(),
      name: item.bank.name,
      city: item.bank.city,
      address: item.bank.address,
      contactPhone: item.bank.contactPhone,
      totalUnits: item.totalUnits,
      availableGroups: item.groups.sort(),
      profileImage: item.bank.profileImage ?? null,
      coverImage: item.bank.coverImage ?? null,
      geo: {
        lat: typeof item.bank.geo?.lat === "number" ? item.bank.geo.lat : null,
        lng: typeof item.bank.geo?.lng === "number" ? item.bank.geo.lng : null,
      },
    }));
  } catch {
    return [];
  }
}

export async function getBankInventoryExpirySummary(userId: string): Promise<BankInventoryExpirySummary> {
  try {
    await connectToDatabase();
    const bank = await BloodBankModel.findOne({ adminUserId: userId }).select("_id").lean();
    if (!bank) {
      return {
        expiringSoonBatches: 0,
        expiringSoonUnits: 0,
        soonestExpiryDate: null,
      };
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [summary] = await InventoryModel.aggregate<{
      expiringSoonBatches: number;
      expiringSoonUnits: number;
      soonestExpiryDate: Date | null;
    }>([
      {
        $match: {
          bankId: bank._id,
          units: { $gt: 0 },
          isExpired: false,
          expiryDate: { $gte: now, $lte: in7Days },
        },
      },
      {
        $group: {
          _id: null,
          expiringSoonBatches: { $sum: 1 },
          expiringSoonUnits: { $sum: "$units" },
          soonestExpiryDate: { $min: "$expiryDate" },
        },
      },
      {
        $project: {
          _id: 0,
          expiringSoonBatches: 1,
          expiringSoonUnits: 1,
          soonestExpiryDate: 1,
        },
      },
    ]);

    return {
      expiringSoonBatches: summary?.expiringSoonBatches ?? 0,
      expiringSoonUnits: summary?.expiringSoonUnits ?? 0,
      soonestExpiryDate: summary?.soonestExpiryDate ? summary.soonestExpiryDate.toISOString() : null,
    };
  } catch {
    return {
      expiringSoonBatches: 0,
      expiringSoonUnits: 0,
      soonestExpiryDate: null,
    };
  }
}

export async function getDonorDashboardData(userId: string) {
  await connectToDatabase();
  const [openRequests, acceptedRequests, notifications] = await Promise.all([
    DonationRequestModel.countDocuments({ status: { $in: ["OPEN", "MATCHING"] } }),
    DonationRequestModel.countDocuments({ acceptedBy: userId }),
    NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  let pendingChats = 0;
  if (Types.ObjectId.isValid(userId)) {
    const donorObjectId = new Types.ObjectId(userId);
    const activeConversations = await ConversationModel.find({
      donorId: donorObjectId,
      isActive: true,
    })
      .select("_id")
      .lean();

    if (activeConversations.length) {
      const conversationIds = activeConversations.map((conversation) => conversation._id);
      const unreadConversationIds = await MessageModel.distinct("conversationId", {
        conversationId: { $in: conversationIds },
        senderId: { $ne: donorObjectId },
        readBy: { $ne: donorObjectId },
      });
      pendingChats = unreadConversationIds.length;
    }
  }

  return { openRequests, acceptedRequests, notifications, pendingChats };
}

export async function getReceiverDashboardData(userId: string) {
  await connectToDatabase();
  const [myRequests, activeRequests, completed] = await Promise.all([
    DonationRequestModel.countDocuments({ createdBy: userId }),
    DonationRequestModel.countDocuments({
      createdBy: userId,
      status: { $in: ["OPEN", "MATCHING", "ACCEPTED", "SCHEDULED"] },
    }),
    DonationRequestModel.countDocuments({ createdBy: userId, status: "COMPLETED" }),
  ]);
  return { myRequests, activeRequests, completed };
}

export async function getBankDashboardData(userId: string) {
  await connectToDatabase();
  const bank = await BloodBankModel.findOne({ adminUserId: userId }).select("_id isVerified name city").lean();
  if (!bank) {
    return {
      bank: null,
      inventoryCount: 0,
      lowStockCount: 0,
      appointmentsPending: 0,
    };
  }
  const [inventoryCount, lowStockCount, appointmentsPending] = await Promise.all([
    InventoryModel.countDocuments({ bankId: bank._id }),
    InventoryModel.countDocuments({ bankId: bank._id, units: { $lte: LOW_STOCK_THRESHOLD }, isExpired: false }),
    AppointmentModel.countDocuments({ bankId: bank._id, status: "PENDING" }),
  ]);

  return { bank, inventoryCount, lowStockCount, appointmentsPending };
}

export async function getAdminDashboardData(role: UserRole, city?: string) {
  await connectToDatabase();
  const cityFilter = role === "CITY_ADMIN" ? { city } : {};
  const [users, pendingBanks, openRequests, lowStock] = await Promise.all([
    UserModel.countDocuments(cityFilter),
    BloodBankModel.countDocuments({ isVerified: false, ...cityFilter }),
    DonationRequestModel.countDocuments({ status: { $in: ["OPEN", "MATCHING"] }, ...cityFilter }),
    InventoryModel.countDocuments({ units: { $lte: LOW_STOCK_THRESHOLD }, isExpired: false, ...cityFilter }),
  ]);

  return { users, pendingBanks, openRequests, lowStock };
}
