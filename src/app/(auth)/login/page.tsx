import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
        Welcome back
      </h1>
      <p className="mt-1 mb-8 text-ink-2">Sign in to your garage.</p>
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </>
  );
}
