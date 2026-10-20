import { Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "@/components/nav-links";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="hazard h-1" />
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-wide uppercase"
          >
            <Wrench className="size-5 text-accent" strokeWidth={2.5} />
            <span className="hidden sm:inline">GarageLog</span>
          </Link>
          <NavLinks />
          <div className="ml-auto">
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}

async function UserMenu() {
  const { user } = await requireUser();
  return (
    <form action={signOut} className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate font-mono text-xs text-ink-3 md:inline">
        {user.email}
      </span>
      <button
        type="submit"
        className="rounded-md px-2 py-1 text-sm font-semibold text-ink-2 hover:bg-panel-2 hover:text-ink"
      >
        Sign out
      </button>
    </form>
  );
}
