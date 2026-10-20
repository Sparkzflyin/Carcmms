"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { setRecallHandled } from "../actions";

export function RecallHandledButton({
  vehicleId,
  campaign,
  handled,
}: {
  vehicleId: string;
  campaign: string;
  handled: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={handled ? "ghost" : "secondary"}
      disabled={pending}
      onClick={() => start(() => setRecallHandled(vehicleId, campaign, !handled))}
    >
      {pending ? "…" : handled ? "Undo" : "Mark handled / not applicable"}
    </Button>
  );
}
