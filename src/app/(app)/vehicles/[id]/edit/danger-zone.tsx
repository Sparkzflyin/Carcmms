"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { deleteVehicle, setVehicleArchived } from "../../actions";

export function VehicleDangerZone({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Card className="mt-10 border-danger/30 p-5">
      <h2 className="font-display text-lg font-bold tracking-wide text-danger uppercase">Danger zone</h2>
      <p className="mb-4 text-sm text-ink-2">
        Archiving hides the vehicle from your garage but keeps its history. Deleting removes it and
        every work order for good.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => start(() => setVehicleArchived(id, !archived))}
        >
          {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          {archived ? "Restore to garage" : "Archive"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this vehicle and all of its work orders? This can't be undone.")) {
              start(() => deleteVehicle(id));
            }
          }}
        >
          <Trash2 className="size-4" /> Delete vehicle
        </Button>
      </div>
    </Card>
  );
}
