type IdLike = { toString(): string } | string;

function toId(value: IdLike) {
  return typeof value === "string" ? value : value.toString();
}

export function canAccessCall(params: {
  callerId: IdLike;
  calleeId: IdLike;
  actorId: IdLike;
}) {
  const actor = toId(params.actorId);
  return toId(params.callerId) === actor || toId(params.calleeId) === actor;
}

type SerializableCall = {
  _id: IdLike;
  conversationId: IdLike;
  requestId: IdLike;
  callerId: IdLike;
  calleeId: IdLike;
  mode: string;
  status: string;
  createdAt: Date | string;
  startedAt?: Date | string | null;
  answeredAt?: Date | string | null;
  endedAt?: Date | string | null;
};

export function serializeCall(call: SerializableCall) {
  return {
    id: toId(call._id),
    conversationId: toId(call.conversationId),
    requestId: toId(call.requestId),
    callerId: toId(call.callerId),
    calleeId: toId(call.calleeId),
    mode: call.mode,
    status: call.status,
    createdAt: new Date(call.createdAt).toISOString(),
    startedAt: call.startedAt ? new Date(call.startedAt).toISOString() : null,
    answeredAt: call.answeredAt ? new Date(call.answeredAt).toISOString() : null,
    endedAt: call.endedAt ? new Date(call.endedAt).toISOString() : null,
  };
}

