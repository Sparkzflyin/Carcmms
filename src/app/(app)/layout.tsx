import { Settings, Wrench } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "@/components/nav-links";
import { requireUser } from "@/lib/auth";
import { signOut } from "../(auth)/actions";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur print:hidden">
        <div className="hazard h-1" />
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-wide uppercase"
          >
            <Wrench className="size-5 text-accent" strokeWidth={2.5} />
            GarageLog
          </Link>
          <div className="hidden md:block">
            <NavLinks variant="top" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 sm:px-6 sm:pt-10 md:pb-10">
        {children}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
        <NavLinks variant="bottom" />
      </div>
    </>
  );
}

async function UserMenu() {
  const { user } = await requireUser();
  return (
    <>
      <span className="mr-2 hidden max-w-48 truncate font-mono text-xs text-ink-3 lg:inline">
        {user.email}
      </span>
      <Link
        href="/settings"
        aria-label="Settings"
        title="Settings"
        className="rounded-md p-2 text-ink-2 hover:bg-panel-2 hover:text-ink"
      >
        <Settings className="size-5" />
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md px-2 py-1 text-sm font-semibold text-ink-2 hover:bg-panel-2 hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </>
  );
}
