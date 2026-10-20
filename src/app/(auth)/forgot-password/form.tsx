"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { requestPasswordReset, type AuthState } from "../actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined,
  );

  if (state?.message) {
    return (
      <div className="rounded-md border border-ok/40 bg-ok-soft px-4 py-3 text-sm text-ok">
        {state.message}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <ErrorNote>{state?.error}</ErrorNote>
      <Button variant="primary" type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-ink-2">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
