import type { Metadata } from "next";
import { ForgotPasswordForm } from "./form";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase">Reset password</h1>
      <p className="mt-1 mb-8 text-ink-2">We&apos;ll email you a link to choose a new one.</p>
      <ForgotPasswordForm />
    </>
  );
}
