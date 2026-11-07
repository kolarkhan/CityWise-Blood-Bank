import { config as loadEnv } from "dotenv";

// Prefer .env.local for local dev, then fallback to .env
loadEnv({ path: ".env.local" });
loadEnv();

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { BLOOD_GROUPS } from "../src/lib/enums";
import { BloodBankModel } from "../src/models/blood-bank";
import { DonationRequestModel } from "../src/models/donation-request";
import { InventoryModel } from "../src/models/inventory";
import { NotificationModel } from "../src/models/notification";
import { UserModel } from "../src/models/user";
import { AppointmentModel } from "../src/models/appointment";
import { AuditLogModel } from "../src/models/audit-log";

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required to run seed");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  await Promise.all([
    AuditLogModel.deleteMany({}),
    AppointmentModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    InventoryModel.deleteMany({}),
    DonationRequestModel.deleteMany({}),
    BloodBankModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const users = await UserModel.insertMany([
    {
      role: "SUPER_ADMIN",
      name: "Super Admin",
      phone: "+10000000001",
      email: "superadmin@citywise.local",
      passwordHash,
      city: "Lahore",
      isAvailable: false,
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: "CITY_ADMIN",
      name: "City Admin Karachi",
      phone: "+10000000002",
      email: "cityadmin@citywise.local",
      passwordHash,
      city: "Karachi",
      isAvailable: false,
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: "BLOOD_BANK_ADMIN",
      name: "Bank Admin One",
      phone: "+10000000003",
      email: "bankadmin@citywise.local",
      passwordHash,
      city: "Karachi",
      isAvailable: false,
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: "DONOR",
      name: "Ayesha Donor",
      phone: "+10000000004",
      email: "donor1@citywise.local",
      passwordHash,
      city: "Karachi",
      bloodGroup: "A+",
      geo: { lat: 24.8615, lng: 67.0099 },
      isAvailable: true,
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: "DONOR",
      name: "Bilal Donor",
      phone: "+10000000005",
      email: "donor2@citywise.local",
      passwordHash,
      city: "Karachi",
      bloodGroup: "O+",
      geo: { lat: 24.879, lng: 67.0334 },
      isAvailable: true,
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: "RECEIVER",
      name: "Receiver User",
      phone: "+10000000006",
      email: "receiver@citywise.local",
      passwordHash,
      city: "Karachi",
      isAvailable: false,
      emailVerified: true,
      phoneVerified: true,
    },
    {
      role: "HOSPITAL",
      name: "General Hospital",
      phone: "+10000000007",
      email: "hospital@citywise.local",
      passwordHash,
      city: "Karachi",
      isAvailable: false,
      emailVerified: true,
      phoneVerified: true,
    },
  ]);

  const bankAdmin = users.find((user) => user.role === "BLOOD_BANK_ADMIN");
  const receiver = users.find((user) => user.role === "RECEIVER");
  const donorA = users.find((user) => user.email === "donor1@citywise.local");
  const donorB = users.find((user) => user.email === "donor2@citywise.local");
  const superAdmin = users.find((user) => user.role === "SUPER_ADMIN");

  if (!bankAdmin || !receiver || !donorA || !donorB || !superAdmin) {
    throw new Error("Seed users missing required roles");
  }

  const bank = await BloodBankModel.create({
    name: "CityWise Central Blood Bank",
    city: "Karachi",
    licenseNo: "KHI-LIC-001",
    contactPhone: "+10000010000",
    address: "Main Shahrah-e-Faisal, Karachi",
    operatingHours: "24/7",
    geo: {
      lat: 24.8727,
      lng: 67.0647,
    },
    adminUserId: bankAdmin._id,
    isVerified: true,
    verifiedBy: superAdmin._id,
    verifiedAt: new Date(),
  });

  await UserModel.findByIdAndUpdate(bankAdmin._id, { $set: { managedBankId: bank._id } });

  await InventoryModel.insertMany(
    BLOOD_GROUPS.map((group, index) => ({
      bankId: bank._id,
      city: bank.city,
      bloodGroup: group,
      units: 10 + index,
      expiryDate: new Date(Date.now() + (30 + index) * 24 * 60 * 60 * 1000),
      batchId: `BATCH-${group.replace("+", "P").replace("-", "N")}`,
      isExpired: false,
    })),
  );

  const normalRequest = await DonationRequestModel.create({
    createdBy: receiver._id,
    patientName: "Ahmed Raza",
    hospitalName: "City Hospital",
    bloodGroup: "A+",
    units: 2,
    city: "Karachi",
    urgency: "NORMAL",
    contactPhone: "+10000020001",
    neededByDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    status: "ACCEPTED",
    acceptedBy: donorA._id,
    acceptedAt: new Date(),
    contactRevealedTo: [donorA._id],
  });

  await DonationRequestModel.create({
    createdBy: receiver._id,
    patientName: "Sana Khalid",
    hospitalName: "Emergency Trauma Center",
    bloodGroup: "O+",
    units: 3,
    city: "Karachi",
    urgency: "EMERGENCY",
    contactPhone: "+10000020002",
    neededByDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    status: "MATCHING",
    emergencyAcceptedBy: [donorB._id],
    notifiedDonors: [donorB._id],
    contactRevealedTo: [donorB._id],
    maxEmergencyAcceptances: 3,
  });

  await AppointmentModel.create({
    requestId: normalRequest._id,
    bankId: bank._id,
    donorId: donorA._id,
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    status: "PENDING",
  });

  await NotificationModel.insertMany([
    {
      userId: donorA._id,
      title: "Welcome donor",
      message: "You are now active on CityWise.",
      type: "SUCCESS",
      read: false,
    },
    {
      userId: receiver._id,
      title: "Request accepted",
      message: "A donor accepted your A+ request.",
      type: "SUCCESS",
      read: false,
    },
  ]);

  console.log("Seed completed.");
  console.log("Demo credentials (password: Password123!):");
  console.log("- superadmin@citywise.local");
  console.log("- cityadmin@citywise.local");
  console.log("- bankadmin@citywise.local");
  console.log("- donor1@citywise.local");
  console.log("- receiver@citywise.local");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
