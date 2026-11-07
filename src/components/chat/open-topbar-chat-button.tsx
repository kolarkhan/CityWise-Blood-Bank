"use client";

import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OPEN_TOPBAR_MESSAGES_EVENT } from "@/lib/events";

export function OpenTopbarChatButton({
  requestId,
  className,
}: {
  requestId: string;
  className?: string;
}) {
  return (
    <Button
      size="icon"
      variant="outline"
      className={className}
      type="button"
      aria-label="Open messages"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent(OPEN_TOPBAR_MESSAGES_EVENT, {
            detail: { requestId },
          }),
        );
      }}
    >
      <span className="relative inline-flex">
        <MessageSquare className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      </span>
    </Button>
  );
}
