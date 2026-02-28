"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api-client";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("redirect") ?? searchParams.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.signin({ email, password });
      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid email or password.";
      if (message.toLowerCase().includes("email verification") || message.toLowerCase().includes("verify your email")) {
        setError("Please verify your email first. Check your inbox for the verification link, or disable \"Require email verification\" in your InsForge project Auth settings for local development.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FD] dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <Card className="w-full max-w-md border-[rgba(148,163,184,0.15)]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Log in</CardTitle>
            <CardDescription>
              Welcome back to SmartHire AI. Enter your credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 rounded-xl py-6"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="text-center text-sm text-[#6B7280] mt-4">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-primary hover:underline"
              >
                Get Started
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-[#F8F9FD] dark:bg-slate-950">
          <Navbar />
          <main className="flex-1 flex items-center justify-center px-6 py-20">
            <div className="text-slate-500">Loading...</div>
          </main>
          <Footer />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
