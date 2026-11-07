import { Types } from "mongoose";

import { NotificationType } from "@/lib/enums";
import { NotificationModel } from "@/models/notification";

export type OutboundMessage = {
  to: string;
  subject: string;
  body: string;
};

export interface MessageProvider {
  send(message: OutboundMessage): Promise<void>;
}

class MockMessageProvider implements MessageProvider {
  async send(message: OutboundMessage) {
    // Placeholder for email/sms integration.
    // In production, replace with SES/Twilio/etc.
    console.info("Mock message provider:", message);
  }
}

export const messageProvider: MessageProvider = new MockMessageProvider();

export async function createNotification(params: {
  userId: string | Types.ObjectId;
  title: string;
  message: string;
  type?: NotificationType;
}) {
  return NotificationModel.create({
    userId: params.userId,
    title: params.title,
    message: params.message,
    type: params.type ?? "INFO",
    read: false,
  });
}
