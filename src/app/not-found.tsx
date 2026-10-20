import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <div className="hazard mb-8 h-2 w-40 rounded-full" />
      <p className="font-mono text-sm text-ink-3">ERROR 404</p>
      <h1 className="font-display text-5xl font-extrabold uppercase">Wrong bay</h1>
      <p className="mt-2 max-w-sm text-ink-2">
        That vehicle or work order doesn&apos;t exist, or it isn&apos;t yours.
      </p>
      <Link href="/" className={buttonClass("primary") + " mt-6"}>
        Back to the garage
      </Link>
    </main>
  );
}
