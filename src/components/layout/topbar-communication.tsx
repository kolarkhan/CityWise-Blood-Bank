"use client";

import { Bell, MessageSquare, Phone, PhoneOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/client";
import { OPEN_TOPBAR_MESSAGES_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";

type ConversationItem = {
  id: string;
  requestId: string;
  patientName: string;
  participant: { id: string; name: string; role: string };
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
};

type ConversationListResponse = {
  conversations: ConversationItem[];
  totalUnread: number;
};

type ConversationMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
};

type ConversationMessagesResponse = {
  conversation: { id: string; requestId: string; donorId: string; receiverId: string };
  messages: ConversationMessage[];
};

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

type CallMode = "AUDIO" | "VIDEO";
type CallStatus = "RINGING" | "ACTIVE" | "DECLINED" | "ENDED" | "MISSED";

type CallSession = {
  id: string;
  conversationId: string;
  requestId: string;
  callerId: string;
  calleeId: string;
  mode: CallMode;
  status: CallStatus;
  createdAt: string;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  callerName?: string;
  calleeName?: string;
};

type IncomingCallsResponse = { incomingCall: CallSession | null; activeCall: CallSession | null };

type CallSignal = {
  id: string;
  type: "OFFER" | "ANSWER" | "ICE_CANDIDATE";
  payload: unknown;
  fromUserId: string;
  createdAt: string;
};

const SIGNAL_POLL_MS = 1200;
const CALL_STATE_POLL_MS = 1000;
const INCOMING_CALL_POLL_MS = 1500;
const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";

function getPeerLabel(call: CallSession, currentUserId: string) {
  return call.callerId === currentUserId ? call.calleeName ?? "Participant" : call.callerName ?? "Participant";
}

export function TopbarCommunication({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);

  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [callActionLoading, setCallActionLoading] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);

  const activeCallRef = useRef<CallSession | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSignalIdRef = useRef<string | null>(null);
  const offerSentForCallRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const suppressedCallIdRef = useRef<string | null>(null);
  const suppressCallUntilRef = useRef<number>(0);
  const suppressedConversationIdRef = useRef<string | null>(null);
  const suppressConversationUntilRef = useRef<number>(0);

  const stunUrl = process.env.NEXT_PUBLIC_WEBRTC_STUN_URL?.trim() || DEFAULT_STUN_URL;

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const isCallSuppressed = useCallback((call: { id: string; conversationId: string }) => {
    const now = Date.now();
    const byCallId =
      Boolean(
        suppressedCallIdRef.current &&
          suppressedCallIdRef.current === call.id &&
          now < suppressCallUntilRef.current,
      );
    const byConversation =
      Boolean(
        suppressedConversationIdRef.current &&
          suppressedConversationIdRef.current === call.conversationId &&
          now < suppressConversationUntilRef.current,
      );
    return byCallId || byConversation;
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchJson<ConversationListResponse>("/api/chat/conversations");
      setConversations(data.conversations);
      setTotalUnread(data.totalUnread);
      if (!selectedConversationId && data.conversations.length) setSelectedConversationId(data.conversations[0].id);
    } catch {
      // ignore polling errors
    }
  }, [selectedConversationId]);

  const loadNotificationsUnread = useCallback(async () => {
    try {
      const data = await fetchJson<{ unreadCount: number }>("/api/notifications?read=false&limit=1&page=1");
      setNotificationsUnread(data.unreadCount ?? 0);
    } catch {
      // ignore polling errors
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchJson<NotificationsResponse>("/api/notifications?limit=10&page=1");
      setNotifications(data.notifications);
      setNotificationsUnread(data.unreadCount ?? 0);
    } catch {
      setNotifications([]);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await fetchJson<ConversationMessagesResponse>(`/api/chat/conversations/${conversationId}/messages`);
      setMessages(data.messages);
    } catch {
      setMessages([]);
    }
  }, []);

  const clearPeerResources = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) track.stop();
      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    setRemoteStream(null);
    setRemoteConnected(false);
    lastSignalIdRef.current = null;
    offerSentForCallRef.current = null;
    pendingIceCandidatesRef.current = [];
  }, []);

  const flushPendingIceCandidates = useCallback(async (peer: RTCPeerConnection) => {
    if (!peer.remoteDescription || !pendingIceCandidatesRef.current.length) {
      return;
    }

    const queued = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // Keep silent; a later candidate update can still recover the call.
      }
    }
  }, []);

  const sendCallSignal = useCallback(async (callId: string, type: "OFFER" | "ANSWER" | "ICE_CANDIDATE", payload: unknown) => {
    await fetchJson(`/api/chat/calls/${callId}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload }),
    });
  }, []);

  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Your browser does not support real-time calling.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const ensurePeerConnection = useCallback(async (call: CallSession) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const peer = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        void sendCallSignal(call.id, "ICE_CANDIDATE", { candidate: event.candidate.toJSON() });
      }
    };

    peer.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      setRemoteConnected(true);
    };

    peer.onconnectionstatechange = () => {
      if (["failed", "disconnected"].includes(peer.connectionState)) {
        setCallError("Connection unstable. Trying to recover...");
      }
    };

    const local = await ensureLocalMedia();
    for (const track of local.getTracks()) peer.addTrack(track, local);

    peerConnectionRef.current = peer;
    return peer;
  }, [ensureLocalMedia, sendCallSignal, stunUrl]);

  const processSignal = useCallback(async (call: CallSession, signal: CallSignal) => {
    const peer = await ensurePeerConnection(call);

    if (signal.type === "OFFER") {
      const offer = signal.payload as RTCSessionDescriptionInit;
      if (!peer.currentRemoteDescription) {
        await peer.setRemoteDescription(offer);
      }
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendCallSignal(call.id, "ANSWER", answer);
      await flushPendingIceCandidates(peer);
      return;
    }

    if (signal.type === "ANSWER") {
      if (!peer.currentRemoteDescription) {
        await peer.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
        await flushPendingIceCandidates(peer);
      }
      return;
    }

    const candidatePayload =
      signal.payload && typeof signal.payload === "object" && "candidate" in signal.payload
        ? (signal.payload as { candidate: RTCIceCandidateInit }).candidate
        : (signal.payload as RTCIceCandidateInit);
    if (!candidatePayload) return;

    if (!peer.remoteDescription) {
      pendingIceCandidatesRef.current.push(candidatePayload);
      return;
    }

    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidatePayload));
    } catch {
      pendingIceCandidatesRef.current.push(candidatePayload);
    }
  }, [ensurePeerConnection, flushPendingIceCandidates, sendCallSignal]);

  const pullCallSignals = useCallback(async (call: CallSession) => {
    try {
      const cursor = lastSignalIdRef.current ? `?after=${encodeURIComponent(lastSignalIdRef.current)}` : "";
      const data = await fetchJson<{ signals: CallSignal[] }>(`/api/chat/calls/${call.id}/signals${cursor}`);
      for (const signal of data.signals) {
        await processSignal(call, signal);
        lastSignalIdRef.current = signal.id;
      }
    } catch {
      // Transient network/dev-server reload errors should not crash the UI.
    }
  }, [processSignal]);

  const startOfferIfCaller = useCallback(async (call: CallSession) => {
    if (call.callerId !== currentUserId || offerSentForCallRef.current === call.id) return;

    const peer = await ensurePeerConnection(call);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await sendCallSignal(call.id, "OFFER", offer);
    offerSentForCallRef.current = call.id;
  }, [currentUserId, ensurePeerConnection, sendCallSignal]);
  const syncCallState = useCallback(async (callId: string) => {
    try {
      const data = await fetchJson<{ call: CallSession }>(`/api/chat/calls/${callId}`);
      const latest = data.call;

      if (["DECLINED", "ENDED", "MISSED"].includes(latest.status)) {
        suppressedCallIdRef.current = latest.id;
        suppressCallUntilRef.current = Date.now() + 10_000;
        suppressedConversationIdRef.current = latest.conversationId;
        suppressConversationUntilRef.current = Date.now() + 30_000;
        if (activeCallRef.current?.id === latest.id) {
          clearPeerResources();
          setActiveCall(null);
          activeCallRef.current = null;
          toast.info(`Call ${latest.status.toLowerCase()}.`);
        }
        return;
      }

      if (isCallSuppressed({ id: latest.id, conversationId: latest.conversationId })) {
        return;
      }

      setActiveCall(latest);

      if (latest.status === "ACTIVE") {
        await ensurePeerConnection(latest);
        await startOfferIfCaller(latest);
        await pullCallSignals(latest);
      }
    } catch {
      // ignore polling errors
    }
  }, [clearPeerResources, ensurePeerConnection, isCallSuppressed, pullCallSignals, startOfferIfCaller]);

  const loadIncomingCalls = useCallback(async () => {
    try {
      const data = await fetchJson<IncomingCallsResponse>("/api/chat/calls/incoming");

      setIncomingCall((prev) => {
        if (!data.incomingCall) return null;
        if (isCallSuppressed({ id: data.incomingCall.id, conversationId: data.incomingCall.conversationId })) return null;
        if (activeCallRef.current?.id === data.incomingCall.id) return null;
        if (prev?.id === data.incomingCall.id) return { ...prev, ...data.incomingCall };
        return data.incomingCall;
      });

      if (data.activeCall) {
        const nextActiveCall = data.activeCall;
        if (isCallSuppressed({ id: nextActiveCall.id, conversationId: nextActiveCall.conversationId })) return;
        setActiveCall((prev) => (prev?.id === nextActiveCall.id ? { ...prev, ...nextActiveCall } : nextActiveCall));
      }
    } catch {
      // ignore polling errors
    }
  }, [isCallSuppressed]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    void loadConversations();
    void loadNotificationsUnread();
    void loadIncomingCalls();
  }, [loadConversations, loadIncomingCalls, loadNotificationsUnread]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadConversations();
      void loadNotificationsUnread();
      void loadIncomingCalls();
      if (notificationsOpen) void loadNotifications();
      if (selectedConversationId) void loadMessages(selectedConversationId);
    }, 6000);
    return () => clearInterval(timer);
  }, [
    loadConversations,
    loadIncomingCalls,
    loadMessages,
    loadNotifications,
    loadNotificationsUnread,
    notificationsOpen,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!selectedConversationId) return;
    void loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!notificationsOpen) return;
    void loadNotifications();
  }, [notificationsOpen, loadNotifications]);

  useEffect(() => {
    const activeCallId = activeCall?.id;
    if (!activeCallId) return;

    const timer = setInterval(() => {
      void syncCallState(activeCallId);
    }, CALL_STATE_POLL_MS);

    void syncCallState(activeCallId);
    return () => clearInterval(timer);
  }, [activeCall?.id, syncCallState]);

  useEffect(() => {
    if (!activeCall || activeCall.status !== "ACTIVE") return;

    const timer = setInterval(() => {
      void pullCallSignals(activeCall);
    }, SIGNAL_POLL_MS);

    void pullCallSignals(activeCall);
    return () => clearInterval(timer);
  }, [activeCall, pullCallSignals]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadIncomingCalls();
    }, INCOMING_CALL_POLL_MS);
    return () => clearInterval(timer);
  }, [loadIncomingCalls]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.srcObject = remoteStream;
    if (remoteStream) {
      void remoteAudioRef.current.play().catch(() => {
        // Browser may block autoplay until user gesture; call controls are user initiated.
      });
    }
  }, [remoteStream]);

  useEffect(() => {
    const handleOpenMessages = async (event: Event) => {
      const customEvent = event as CustomEvent<{ requestId?: string }>;
      const targetRequestId = customEvent.detail?.requestId;

      setNotificationsOpen(false);
      setOpen(true);

      try {
        const data = await fetchJson<ConversationListResponse>("/api/chat/conversations");
        setConversations(data.conversations);
        setTotalUnread(data.totalUnread);

        if (targetRequestId) {
          const matchedConversation = data.conversations.find((c) => c.requestId === targetRequestId);
          if (matchedConversation) {
            setSelectedConversationId(matchedConversation.id);
            await loadMessages(matchedConversation.id);
            return;
          }
        }

        if (!selectedConversationId && data.conversations.length) {
          setSelectedConversationId(data.conversations[0].id);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener(OPEN_TOPBAR_MESSAGES_EVENT, handleOpenMessages as EventListener);
    return () => window.removeEventListener(OPEN_TOPBAR_MESSAGES_EVENT, handleOpenMessages as EventListener);
  }, [loadMessages, selectedConversationId]);

  useEffect(() => () => clearPeerResources(), [clearPeerResources]);

  const sendMessage = async () => {
    if (!selectedConversationId || !message.trim()) return;
    try {
      setSending(true);
      await fetchJson(`/api/chat/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      setMessage("");
      await loadMessages(selectedConversationId);
      await loadConversations();
    } finally {
      setSending(false);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetchJson("/api/notifications", { method: "PATCH" });
      await loadNotifications();
      await loadNotificationsUnread();
    } catch {
      // ignore
    }
  };

  const startCall = async () => {
    if (!selectedConversationId || !selectedConversation) return;
    try {
      setCallActionLoading("AUDIO");
      setCallError(null);
      suppressedCallIdRef.current = null;
      suppressCallUntilRef.current = 0;
      suppressedConversationIdRef.current = null;
      suppressConversationUntilRef.current = 0;

      const data = await fetchJson<{ call: CallSession }>(`/api/chat/conversations/${selectedConversationId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "AUDIO" }),
      });

      setActiveCall((previous) => ({
        ...data.call,
        callerName: data.call.callerId === currentUserId ? "You" : previous?.callerName ?? selectedConversation.participant.name,
        calleeName: data.call.calleeId === currentUserId ? "You" : previous?.calleeName ?? selectedConversation.participant.name,
      }));
      setIncomingCall((previous) => (previous?.id === data.call.id ? null : previous));
      setOpen(true);
      toast.success("Audio call started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start call");
    } finally {
      setCallActionLoading(null);
    }
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      setCallActionLoading("ACCEPT");
      setCallError(null);
      suppressedCallIdRef.current = null;
      suppressCallUntilRef.current = 0;
      suppressedConversationIdRef.current = null;
      suppressConversationUntilRef.current = 0;
      const data = await fetchJson<{ call: CallSession }>(`/api/chat/calls/${incomingCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      setIncomingCall(null);
      setActiveCall(data.call);
      setOpen(true);
      toast.success("Call accepted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to accept call");
    } finally {
      setCallActionLoading(null);
    }
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;
    try {
      setCallActionLoading("DECLINE");
      await fetchJson(`/api/chat/calls/${incomingCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DECLINE" }),
      });
      setIncomingCall(null);
      toast.info("Call declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to decline call");
    } finally {
      setCallActionLoading(null);
    }
  };

  const endActiveCall = async () => {
    if (!activeCall) return;
    const endedCallId = activeCall.id;
    const endedConversationId = activeCall.conversationId;
    setCallActionLoading("END");
    suppressedCallIdRef.current = endedCallId;
    suppressCallUntilRef.current = Date.now() + 60_000;
    suppressedConversationIdRef.current = endedConversationId;
    suppressConversationUntilRef.current = Date.now() + 60_000;

    // Optimistic close: end locally first, sync with server in background.
    clearPeerResources();
    setActiveCall(null);
    activeCallRef.current = null;
    setCallActionLoading(null);
    toast.info("Call ended.");

    const pushEndToServer = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await fetchJson(`/api/chat/calls/${endedCallId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "END" }),
          });
          return;
        } catch {
          if (attempt === 2) return;
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    };

    void pushEndToServer();
  };

  const activeCallPeerName = activeCall ? getPeerLabel(activeCall, currentUserId) : "";
  const incomingCallPeerName = incomingCall ? getPeerLabel(incomingCall, currentUserId) : "";

  return (
    <div className="relative inline-flex items-center gap-2">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <button
        type="button"
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-transform duration-200 will-change-transform hover:scale-110 hover:-translate-y-0.5",
          notificationsOpen && "bg-rose-50 text-rose-700",
        )}
        aria-label="Notifications"
        onClick={() => {
          setNotificationsOpen((prev) => !prev);
          setOpen(false);
        }}
      >
        <Bell className="h-4 w-4" />
        {notificationsUnread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {notificationsUnread > 99 ? "99+" : notificationsUnread}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-transform duration-200 will-change-transform hover:scale-110 hover:-translate-y-0.5",
          open && "bg-red-50 text-red-700",
        )}
        aria-label="Messages"
        onClick={() => {
          setOpen((prev) => !prev);
          setNotificationsOpen(false);
        }}
      >
        <MessageSquare className="h-4 w-4" />
        {totalUnread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        ) : null}
      </button>

      {incomingCall ? (
        <div className="absolute right-0 top-12 z-40 w-[320px] rounded-lg border border-emerald-200 bg-white shadow-xl">
          <div className="border-b border-emerald-100 px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">Incoming {incomingCall.mode.toLowerCase()} call</p>
            <p className="text-xs text-slate-600">{incomingCallPeerName}</p>
          </div>
          <div className="flex items-center justify-end gap-2 p-3">
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={declineIncomingCall}
              disabled={callActionLoading === "ACCEPT" || callActionLoading === "DECLINE"}
            >
              Decline
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={acceptIncomingCall}
              disabled={callActionLoading === "ACCEPT" || callActionLoading === "DECLINE"}
            >
              Accept
            </Button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-[420px] rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">Messages</p>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen(false)}
              aria-label="Close messages"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid max-h-[560px] grid-cols-[160px_1fr]">
            <div className="overflow-y-auto border-r border-slate-200">
              {conversations.length ? (
                conversations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedConversationId(item.id)}
                    className={cn(
                      "w-full border-b border-slate-100 px-2 py-2 text-left hover:bg-slate-50",
                      selectedConversationId === item.id && "bg-red-50",
                    )}
                  >
                    <p className="truncate text-xs font-semibold text-slate-800">{item.participant.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{item.patientName}</p>
                    {item.unreadCount > 0 ? (
                      <span className="mt-1 inline-flex rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {item.unreadCount}
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="px-2 py-3 text-xs text-slate-500">No conversations</p>
              )}
            </div>

            <div className="flex min-h-[320px] flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <p className="text-xs font-semibold text-slate-700">
                  {selectedConversation
                    ? `${selectedConversation.participant.name} (${selectedConversation.patientName})`
                    : "Select a conversation"}
                </p>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-transform duration-200 hover:scale-110 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => void startCall()}
                    disabled={!selectedConversationId || callActionLoading !== null || Boolean(activeCall)}
                    aria-label="Start audio call"
                    title="Start audio call"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {activeCall ? (
                <div className="space-y-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">
                      {activeCall.status === "RINGING" ? "Calling" : "In Call"}: {activeCallPeerName}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-rose-200 px-2 text-[11px] text-rose-700 hover:bg-rose-50"
                      onClick={endActiveCall}
                      disabled={callActionLoading === "END"}
                    >
                      <PhoneOff className="mr-1 h-3.5 w-3.5" />
                      End
                    </Button>
                  </div>

                  {callError ? <p className="text-[11px] text-amber-700">{callError}</p> : null}

                  <div className="rounded-md border border-slate-200 bg-white px-2 py-2">
                    <p className="text-[11px] text-slate-600">
                      {remoteConnected
                        ? "Audio connected. You can talk now."
                        : activeCall.status === "RINGING"
                          ? "Ringing..."
                          : "Connecting audio..."}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-2">
                {messages.length ? (
                  messages.map((item) => {
                    const mine = item.sender.id === currentUserId;
                    return (
                      <div key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-md px-2 py-1.5 text-xs",
                            mine ? "bg-red-600 text-white" : "bg-white text-slate-800",
                          )}
                        >
                          <p className="mb-0.5 text-[10px] opacity-80">{item.sender.name}</p>
                          <p>{item.body}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No messages yet.</p>
                )}
              </div>
              <div className="flex gap-2 border-t border-slate-200 p-2">
                <Input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Type message..."
                  className="h-9 text-xs"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button size="sm" disabled={sending || !selectedConversationId} onClick={sendMessage}>
                  {sending ? "..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {notificationsOpen ? (
        <div className="absolute right-0 top-12 z-30 w-[360px] rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            <div className="inline-flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={markAllNotificationsRead}
                disabled={notificationsUnread === 0}
              >
                Mark all read
              </Button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-2">
            {notifications.length ? (
              notifications.map((item) => (
                <div
                  key={item._id}
                  className={cn("mb-2 rounded-md border border-slate-200 p-2", !item.read && "border-rose-200 bg-rose-50/40")}
                >
                  <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-600">{item.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="p-2 text-xs text-slate-500">No notifications found.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
