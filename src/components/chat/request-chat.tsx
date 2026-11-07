"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/client";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
};

type ChatResponse = {
  conversation: {
    id: string;
    requestId: string;
    donorId: string;
    receiverId: string;
    patientName: string;
  };
  messages: ChatMessage[];
};

type RequestChatProps = {
  requestId: string;
  currentUserId: string;
  donorId?: string;
  title?: string;
};

export function RequestChat({ requestId, currentUserId, donorId, title }: RequestChatProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<ChatResponse | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (donorId) {
      params.set("donorId", donorId);
    }
    const qs = params.toString();
    return `/api/requests/${requestId}/chat${qs ? `?${qs}` : ""}`;
  }, [requestId, donorId]);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchJson<ChatResponse>(endpoint);
      setChat(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  const sendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    try {
      setSending(true);
      await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          donorId,
        }),
      });
      setMessage("");
      await loadMessages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? "Request Communication"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          {loading && !chat ? <p className="text-sm text-slate-500">Loading chat...</p> : null}
          {chat?.messages.length ? (
            chat.messages.map((item) => {
              const mine = item.senderId === currentUserId;
              return (
                <div
                  key={item.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      mine ? "bg-red-600 text-white" : "bg-white text-slate-800",
                    )}
                  >
                    <p className="mb-1 text-xs opacity-80">
                      {item.senderName} ({item.senderRole})
                    </p>
                    <p>{item.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type your message..."
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
          />
          <Button onClick={sendMessage} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
