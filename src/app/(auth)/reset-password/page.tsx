import type { Metadata } from "next";
import { ResetPasswordForm } from "./form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">
        New password
      </h1>
      <p className="mt-1 mb-8 text-ink-2">Choose a new password for your account.</p>
      <ResetPasswordForm />
    </>
  );
}
