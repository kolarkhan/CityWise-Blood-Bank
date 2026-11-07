"use client";

import { MapPin, MessageCircle, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchJson } from "@/lib/client";
import type { LandingDonorCard } from "@/lib/dashboard-data";
import { OPEN_TOPBAR_MESSAGES_EVENT } from "@/lib/events";
import { cn } from "@/lib/utils";

type DonorReactionStats = Record<string, { reaction: 1 | -1 | 0; likes: number; dislikes: number }>;

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  if (!parts.length) return "D";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "D";
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function AvailableDonorsFeed({
  donors,
  isAuthenticated,
  currentUserId,
}: {
  donors: LandingDonorCard[];
  isAuthenticated: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [reactionStats, setReactionStats] = useState<DonorReactionStats>(() =>
    Object.fromEntries(
      donors.map((donor) => [
        donor.id,
        {
          likes: donor.likes,
          dislikes: donor.dislikes,
          reaction: donor.reaction,
        },
      ]),
    ),
  );
  const [pendingReactionByDonor, setPendingReactionByDonor] = useState<Record<string, boolean>>({});

  const getNextReactionState = (
    current: { reaction: 1 | -1 | 0; likes: number; dislikes: number },
    value: 1 | -1,
  ) => {
    const next = { ...current };

    if (current.reaction === value) {
      if (value === 1) next.likes = Math.max(0, next.likes - 1);
      if (value === -1) next.dislikes = Math.max(0, next.dislikes - 1);
      next.reaction = 0;
      return next;
    }

    if (value === 1) {
      if (current.reaction === -1) {
        next.dislikes = Math.max(0, next.dislikes - 1);
      }
      next.likes += 1;
      next.reaction = 1;
      return next;
    }

    if (current.reaction === 1) {
      next.likes = Math.max(0, next.likes - 1);
    }
    next.dislikes += 1;
    next.reaction = -1;
    return next;
  };

  const saveReaction = async (donorId: string, value: 1 | -1) => {
    if (!isAuthenticated || !currentUserId) {
      router.push(`/auth/login?next=${encodeURIComponent("/")}`);
      return;
    }

    if (pendingReactionByDonor[donorId]) {
      return;
    }

    const donorFallback = donors.find((donor) => donor.id === donorId);
    const currentStats = reactionStats[donorId] ?? {
      likes: donorFallback?.likes ?? 0,
      dislikes: donorFallback?.dislikes ?? 0,
      reaction: donorFallback?.reaction ?? 0,
    };
    const optimisticStats = getNextReactionState(currentStats, value);

    setReactionStats((previous) => ({
      ...previous,
      [donorId]: optimisticStats,
    }));
    setPendingReactionByDonor((previous) => ({ ...previous, [donorId]: true }));
    try {
      const data = await fetchJson<{
        donorId: string;
        reaction: 1 | -1 | 0;
        likes: number;
        dislikes: number;
      }>(`/api/donors/${donorId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: value }),
      });

      setReactionStats((previous) => ({
        ...previous,
        [donorId]: {
          likes: data.likes,
          dislikes: data.dislikes,
          reaction: data.reaction,
        },
      }));
    } catch (error) {
      setReactionStats((previous) => ({
        ...previous,
        [donorId]: currentStats,
      }));
      toast.error(error instanceof Error ? error.message : "Unable to update reaction");
    } finally {
      setPendingReactionByDonor((previous) => ({ ...previous, [donorId]: false }));
    }
  };

  const visibleReactionStats = useMemo(
    () =>
      donors.reduce<DonorReactionStats>((acc, donor) => {
        acc[donor.id] = reactionStats[donor.id] ?? {
          likes: donor.likes,
          dislikes: donor.dislikes,
          reaction: donor.reaction,
        };
        return acc;
      }, {}),
    [donors, reactionStats],
  );

  const openMessageFlow = async (donor: LandingDonorCard) => {
    if (!isAuthenticated) {
      router.push(`/auth/login?next=${encodeURIComponent("/")}`);
      return;
    }

    try {
      const data = await fetchJson<{ requestId: string }>("/api/chat/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorId: donor.id }),
      });
      window.dispatchEvent(
        new CustomEvent(OPEN_TOPBAR_MESSAGES_EVENT, {
          detail: { requestId: data.requestId },
        }),
      );
      toast.success(`Chat ready with ${donor.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start chat");
    }
  };

  const shareDonor = async (donor: LandingDonorCard) => {
    const text = `CityWise donor: ${donor.name} (${donor.bloodGroup}) from ${donor.city}`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/search?city=${encodeURIComponent(donor.city)}&bloodGroup=${encodeURIComponent(donor.bloodGroup)}` : "";

    try {
      if (navigator.share) {
        await navigator.share({ title: "CityWise Donor", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      }
      toast.success("Donor details shared");
    } catch {
      toast.error("Unable to share donor details");
    }
  };

  if (!donors.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-slate-600">No available donors found right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {donors.map((donor) => {
          const stats = visibleReactionStats[donor.id];
          const reaction = stats.reaction;
          const isPending = Boolean(pendingReactionByDonor[donor.id]);
          return (
            <Card className="border-slate-200 bg-white/95 transition-transform duration-200 will-change-transform hover:scale-[1.02]" key={donor.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700">
                      {getInitials(donor.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{donor.name}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <MapPin className="h-3.5 w-3.5" /> {donor.city}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                    {donor.bloodGroup}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 gap-1 bg-transparent px-1.5 text-slate-500 hover:bg-transparent hover:text-emerald-600",
                      reaction === 1 && "text-emerald-600",
                    )}
                    aria-label="Like donor"
                    title="Like"
                    onClick={() => void saveReaction(donor.id, 1)}
                    disabled={isPending}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="text-[11px] font-semibold">{stats.likes}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 gap-1 bg-transparent px-1.5 text-slate-500 hover:bg-transparent hover:text-rose-600",
                      reaction === -1 && "text-rose-600",
                    )}
                    aria-label="Dislike donor"
                    title="Dislike"
                    onClick={() => void saveReaction(donor.id, -1)}
                    disabled={isPending}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    <span className="text-[11px] font-semibold">{stats.dislikes}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-transparent p-0 text-slate-500 hover:bg-transparent hover:text-blue-600"
                    aria-label="Message donor"
                    title="Message"
                    onClick={() => void openMessageFlow(donor)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-transparent p-0 text-slate-500 hover:bg-transparent hover:text-slate-900"
                    aria-label="Share donor"
                    title="Share"
                    onClick={() => void shareDonor(donor)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
