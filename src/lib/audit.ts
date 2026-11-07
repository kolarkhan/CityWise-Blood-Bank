import { Types } from "mongoose";

import { AuditLogModel } from "@/models/audit-log";

type AuditArgs = {
  actorId?: string | Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId: string | Types.ObjectId;
  meta?: Record<string, unknown>;
};

export async function logAudit(args: AuditArgs) {
  await AuditLogModel.create({
    actorId: args.actorId ?? null,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    meta: args.meta ?? {},
  });
}
