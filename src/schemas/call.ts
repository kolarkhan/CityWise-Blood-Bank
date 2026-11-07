import { z } from "zod";

export const startCallSchema = z.object({
  mode: z.enum(["AUDIO", "VIDEO"]),
});

export const callActionSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE", "END"]),
});

export const callSignalSchema = z.object({
  type: z.enum(["OFFER", "ANSWER", "ICE_CANDIDATE"]),
  payload: z.unknown(),
});

