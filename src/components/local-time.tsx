"use client";

import { formatDate, formatDateTime } from "@/lib/format";

// Timestamps render on the server in UTC; re-render them in the viewer's
// own timezone once on the client.
export function LocalTime({ iso, withTime }: { iso: string | null; withTime?: boolean }) {
  if (!iso) return <>—</>;
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {withTime ? formatDateTime(iso) : formatDate(iso)}
    </time>
  );
}
