"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/lib/enums";
import { fetchJson } from "@/lib/client";
import { syncSignedInUserLocationFromDevice } from "@/lib/geo-client";
import { GOOGLE_PENDING_SIGNIN_KEY, parseGoogleRoleOptions, type PendingGoogleSignin } from "@/lib/google-auth";
import { getDefaultDashboardPath } from "@/lib/routes";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAuthSuccessResponse = {
  success: true;
  data: {
    user: {
      role: UserRole;
    };
    onboardingPath?: string | null;
  };
};

type GoogleAuthErrorResponse = {
  success: false;
  error: string;
  requiresRoleSelection?: boolean;
  roleOptions?: GoogleRole[];
};

type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number | string;
      logo_alignment?: "left" | "center";
    },
  ) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentity;
      };
    };
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const afterLogin = useCallback(
    async (role: UserRole, onboardingPath?: string | null) => {
      try {
        await syncSignedInUserLocationFromDevice();
      } catch {
        // Do not block login if location permission is denied or geo lookup fails.
      }
      const safeNext = next && next.startsWith("/") ? next : null;
      const safeOnboardingPath =
        onboardingPath && onboardingPath.startsWith("/dashboard/donor/profile") ? onboardingPath : null;
      router.push(safeOnboardingPath ?? safeNext ?? getDefaultDashboardPath(role));
      router.refresh();
    },
    [next, router],
  );

  const loginWithGoogleToken = useCallback(
    async (idToken?: string) => {
      if (!idToken) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      try {
        setGoogleLoading(true);
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        const body = (await response.json()) as GoogleAuthSuccessResponse | GoogleAuthErrorResponse;
        if (!response.ok || body.success === false) {
          if (body && "requiresRoleSelection" in body && body.requiresRoleSelection) {
            const pending: PendingGoogleSignin = {
              idToken,
              roleOptions: parseGoogleRoleOptions(body.roleOptions),
              next: next && next.startsWith("/") ? next : null,
              createdAt: Date.now(),
            };
            try {
              sessionStorage.setItem(GOOGLE_PENDING_SIGNIN_KEY, JSON.stringify(pending));
            } catch {
              toast.error("Unable to continue Google sign-in. Please try again.");
              return;
            }
            router.push("/auth/select-role");
            return;
          }
          throw new Error(body && "error" in body ? body.error : "Google login failed");
        }

        try {
          sessionStorage.removeItem(GOOGLE_PENDING_SIGNIN_KEY);
        } catch {
          // ignore storage errors
        }
        toast.success("Logged in with Google");
        await afterLogin(body.data.user.role, body.data.onboardingPath ?? null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Google login failed");
      } finally {
        setGoogleLoading(false);
      }
    },
    [afterLogin, next, router],
  );

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }
    setGoogleLoadFailed(false);
    setGoogleReady(false);

    const setupGoogleButton = () => {
      const googleId = window.google?.accounts?.id;
      if (!googleId || !googleButtonRef.current) {
        setGoogleLoadFailed(true);
        return;
      }

      googleId.initialize({
        client_id: googleClientId,
        callback: (response) => {
          void loginWithGoogleToken(response.credential);
        },
      });

      googleButtonRef.current.innerHTML = "";
      googleId.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: "100%",
        logo_alignment: "left",
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      setupGoogleButton();
      return;
    }

    const existingScript = document.getElementById("google-identity-script");
    if (existingScript) {
      existingScript.addEventListener("load", setupGoogleButton, { once: true });
      return () => {
        existingScript.removeEventListener("load", setupGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.id = "google-identity-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = setupGoogleButton;
    script.onerror = () => {
      setGoogleLoadFailed(true);
    };
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [googleClientId, loginWithGoogleToken]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setLoading(true);
      const result = await fetchJson<{ user: { role: UserRole }; onboardingPath?: string | null }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      toast.success("Logged in");
      await afterLogin(result.user.role, result.onboardingPath ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Sign in to your CityWise account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">or</span>
              </div>
            </div>
            {googleClientId ? (
              <div className="space-y-1">
                <div className="min-h-10" ref={googleButtonRef} aria-label="Sign in with Google" />
                {!googleReady ? (
                  <Button type="button" variant="outline" className="w-full" disabled>
                    {googleLoadFailed ? "Google sign-in unavailable" : "Loading Google sign-in..."}
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" disabled>
                Google sign-in is not configured
              </Button>
            )}
            {googleLoading && googleReady ? <p className="text-xs text-slate-500">Signing in with Google...</p> : null}
          </div>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          New user?{" "}
          <Link href="/auth/register" className="font-semibold text-red-600 hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
