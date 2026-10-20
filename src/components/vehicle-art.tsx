import { Car, Motorbike } from "lucide-react";
import type { VehicleType } from "@/lib/types";
import { cx } from "./ui";

// Photo if there is one, otherwise a big outlined silhouette on a striped plate.
export function VehicleArt({
  type,
  photoUrl,
  alt,
  className,
}: {
  type: VehicleType;
  photoUrl?: string | null;
  alt: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // Signed storage URLs change hourly, so skip next/image optimization.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={alt} className={cx("object-cover", className)} />
    );
  }
  const Icon = type === "motorcycle" ? Motorbike : Car;
  return (
    <div
      className={cx(
        "flex items-center justify-center bg-panel-2 text-ink-3",
        "bg-[repeating-linear-gradient(-45deg,transparent_0_10px,var(--line)_10px_11px)]",
        className,
      )}
      role="img"
      aria-label={alt}
    >
      <Icon className="size-16 opacity-70" strokeWidth={1.25} />
    </div>
  );
}
