"use client";

import { useActionState } from "react";
import { Button, ErrorNote, Field, Input } from "@/components/ui";
import { updatePassword, type AuthState } from "../actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <ErrorNote>{state?.error}</ErrorNote>
      <Button variant="primary" type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
