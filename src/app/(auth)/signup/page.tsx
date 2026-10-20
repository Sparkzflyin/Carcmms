import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
        Open your garage
      </h1>
      <p className="mt-1 mb-8 text-ink-2">Free to start. Add your first vehicle in a minute.</p>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
