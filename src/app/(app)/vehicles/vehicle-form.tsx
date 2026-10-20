"use client";

import { Car, ImagePlus, Motorbike, Plus, ScanLine, X } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { CustomFieldDefinition, CustomFieldType, Vehicle, VehicleType } from "@/lib/types";
import { createCustomField, lookupVin, saveVehicle, type FormState } from "./actions";

const CAR_MAKES = [
  "Acura",
  "Alfa Romeo",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Mazda",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Polestar",
  "Porsche",
  "Ram",
  "Rivian",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];
const MOTORCYCLE_MAKES = [
  "Aprilia",
  "BMW",
  "Can-Am",
  "Ducati",
  "Harley-Davidson",
  "Honda",
  "Husqvarna",
  "Indian",
  "Kawasaki",
  "KTM",
  "Moto Guzzi",
  "Royal Enfield",
  "Suzuki",
  "Triumph",
  "Yamaha",
  "Zero",
];

type Values = Record<
  | "nickname"
  | "year"
  | "make"
  | "model"
  | "trim"
  | "vin"
  | "body_style"
  | "engine"
  | "transmission"
  | "drivetrain"
  | "fuel_type"
  | "color"
  | "license_plate"
  | "odometer"
  | "odometer_unit"
  | "purchase_date"
  | "purchase_price"
  | "purchase_odometer"
  | "notes",
  string
>;

function initialValues(v?: Vehicle): Values {
  const s = (x: string | number | null | undefined) => (x == null ? "" : String(x));
  return {
    nickname: s(v?.nickname),
    year: s(v?.year),
    make: s(v?.make),
    model: s(v?.model),
    trim: s(v?.trim),
    vin: s(v?.vin),
    body_style: s(v?.body_style),
    engine: s(v?.engine),
    transmission: s(v?.transmission),
    drivetrain: s(v?.drivetrain),
    fuel_type: s(v?.fuel_type),
    color: s(v?.color),
    license_plate: s(v?.license_plate),
    odometer: s(v?.odometer),
    odometer_unit: v?.odometer_unit ?? "mi",
    purchase_date: s(v?.purchase_date),
    purchase_price: s(v?.purchase_price),
    purchase_odometer: s(v?.purchase_odometer),
    notes: s(v?.notes),
  };
}

export function VehicleForm({
  userId,
  vehicle,
  photoUrl,
  customFields: initialCustomFields,
}: {
  userId: string;
  vehicle?: Vehicle;
  photoUrl?: string | null;
  customFields: CustomFieldDefinition[];
}) {
  const [type, setType] = useState<VehicleType>(vehicle?.vehicle_type ?? "car");
  const [values, setValues] = useState<Values>(() => initialValues(vehicle));
  const [customFields, setCustomFields] = useState(initialCustomFields);
  const [vinStatus, setVinStatus] = useState<{ error?: string; ok?: string }>({});
  const [decoding, startDecode] = useTransition();
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      // Upload straight to storage from the browser so big phone photos
      // don't have to squeeze through a server action request.
      if (photo) {
        const ext = photo.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/vehicles/${crypto.randomUUID()}.${ext}`;
        const { error } = await createClient()
          .storage.from("photos")
          .upload(path, photo.file, { contentType: photo.file.type });
        if (error) return { error: `Photo upload failed: ${error.message}` };
        formData.set("photo_path", path);
      } else if (removePhoto) {
        formData.set("photo_path", "");
      }
      return saveVehicle(prev, formData);
    },
    undefined,
  );

  const set = (key: keyof Values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function decode() {
    setVinStatus({});
    startDecode(async () => {
      const result = await lookupVin(values.vin);
      if ("error" in result) {
        setVinStatus({ error: result.error });
        return;
      }
      setType(result.vehicle_type);
      setValues((v) => ({
        ...v,
        year: result.year ? String(result.year) : v.year,
        make: result.make || v.make,
        model: result.model || v.model,
        trim: result.trim || v.trim,
        body_style: result.body_style || v.body_style,
        engine: result.engine || v.engine,
        transmission: result.transmission || v.transmission,
        drivetrain: result.drivetrain || v.drivetrain,
        fuel_type: result.fuel_type || v.fuel_type,
      }));
      setVinStatus({
        ok: `Found: ${[result.year, result.make, result.model].filter(Boolean).join(" ")}`,
      });
    });
  }

  const visibleCustomFields = customFields.filter(
    (f) => f.applies_to === "all" || f.applies_to === type,
  );
  const currentPhoto = photo?.preview ?? (removePhoto ? null : photoUrl);
  const isBike = type === "motorcycle";

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      {!photo && !removePhoto && vehicle?.photo_path && (
        <input type="hidden" name="photo_path" value={vehicle.photo_path} />
      )}
      <input type="hidden" name="vehicle_type" value={type} />

      <div className="flex min-w-0 flex-col gap-6">
        {/* Type */}
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Vehicle type">
          {(
            [
              ["car", "Car / Truck", Car],
              ["motorcycle", "Motorcycle", Motorbike],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
              className={cx(
                "flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition",
                type === value
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line bg-panel text-ink-2 hover:border-line-strong",
              )}
            >
              <Icon className={cx("size-7", type === value && "text-accent")} strokeWidth={1.5} />
              <span className="font-display text-lg font-bold tracking-wide uppercase">
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* VIN */}
        <Card className="p-5">
          <FormSectionTitle
            n={1}
            title="VIN autofill"
            sub="Optional. Pulls specs from the NHTSA database."
          />
          <div className="flex gap-2">
            <Input
              name="vin"
              value={values.vin}
              onChange={(e) => setValues((v) => ({ ...v, vin: e.target.value.toUpperCase() }))}
              placeholder="17-character VIN"
              maxLength={17}
              className="font-mono tracking-widest uppercase"
              aria-label="VIN"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  decode();
                }
              }}
            />
            <Button
              type="button"
              onClick={decode}
              disabled={decoding || values.vin.trim().length !== 17}
            >
              <ScanLine className="size-4" />
              {decoding ? "Decoding…" : "Decode"}
            </Button>
          </div>
          {vinStatus.error && <p className="mt-2 text-sm text-danger">{vinStatus.error}</p>}
          {vinStatus.ok && (
            <p className="mt-2 text-sm font-semibold text-ok">
              ✓ {vinStatus.ok}. Review the fields below.
            </p>
          )}
        </Card>

        {/* Basics */}
        <Card className="p-5">
          <FormSectionTitle n={2} title="Basics" />
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Year" htmlFor="year" className="sm:col-span-2">
              <Input
                id="year"
                name="year"
                inputMode="numeric"
                value={values.year}
                onChange={set("year")}
                placeholder="2019"
              />
            </Field>
            <Field label="Make *" htmlFor="make" className="sm:col-span-2">
              <Input
                id="make"
                name="make"
                list="makes"
                required
                value={values.make}
                onChange={set("make")}
                placeholder={isBike ? "Honda" : "Toyota"}
              />
              <datalist id="makes">
                {(isBike ? MOTORCYCLE_MAKES : CAR_MAKES).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <Field label="Model *" htmlFor="model" className="sm:col-span-2">
              <Input
                id="model"
                name="model"
                required
                value={values.model}
                onChange={set("model")}
                placeholder={isBike ? "CB650R" : "Tacoma"}
              />
            </Field>
            <Field label="Trim" htmlFor="trim" className="sm:col-span-3">
              <Input
                id="trim"
                name="trim"
                value={values.trim}
                onChange={set("trim")}
                placeholder={isBike ? "ABS" : "TRD Off-Road"}
              />
            </Field>
            <Field label="Nickname" htmlFor="nickname" className="sm:col-span-3">
              <Input
                id="nickname"
                name="nickname"
                value={values.nickname}
                onChange={set("nickname")}
                placeholder="Daily driver, project car…"
              />
            </Field>
          </div>
        </Card>

        {/* Specs */}
        <Card className="p-5">
          <FormSectionTitle n={3} title="Specs" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Engine" htmlFor="engine">
              <Input
                id="engine"
                name="engine"
                value={values.engine}
                onChange={set("engine")}
                placeholder={isBike ? "649cc Inline-4" : "3.5L V6"}
              />
            </Field>
            <Field label="Transmission" htmlFor="transmission">
              <Input
                id="transmission"
                name="transmission"
                value={values.transmission}
                onChange={set("transmission")}
                placeholder="6-speed manual"
              />
            </Field>
            {!isBike && (
              <Field label="Drivetrain" htmlFor="drivetrain">
                <Input
                  id="drivetrain"
                  name="drivetrain"
                  list="drivetrains"
                  value={values.drivetrain}
                  onChange={set("drivetrain")}
                  placeholder="4WD"
                />
                <datalist id="drivetrains">
                  {["FWD", "RWD", "AWD", "4WD"].map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </Field>
            )}
            <Field label="Body style" htmlFor="body_style">
              <Input
                id="body_style"
                name="body_style"
                value={values.body_style}
                onChange={set("body_style")}
                placeholder={isBike ? "Naked, Sport, Cruiser…" : "Pickup, Sedan, SUV…"}
              />
            </Field>
            <Field label="Fuel" htmlFor="fuel_type">
              <Input
                id="fuel_type"
                name="fuel_type"
                list="fuels"
                value={values.fuel_type}
                onChange={set("fuel_type")}
                placeholder="Gasoline"
              />
              <datalist id="fuels">
                {["Gasoline", "Diesel", "Hybrid", "Plug-in hybrid", "Electric", "E85"].map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </Field>
            <Field label="Color" htmlFor="color">
              <Input
                id="color"
                name="color"
                value={values.color}
                onChange={set("color")}
                placeholder="Magnetic Gray"
              />
            </Field>
          </div>
        </Card>

        {/* Usage & ownership */}
        <Card className="p-5">
          <FormSectionTitle n={4} title="Usage & ownership" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Current odometer" htmlFor="odometer">
              <div className="flex gap-2">
                <Input
                  id="odometer"
                  name="odometer"
                  inputMode="numeric"
                  value={values.odometer}
                  onChange={set("odometer")}
                  placeholder="0"
                  className="font-mono"
                />
                <Select
                  name="odometer_unit"
                  value={values.odometer_unit}
                  onChange={set("odometer_unit")}
                  className="w-28 shrink-0"
                  aria-label="Odometer unit"
                >
                  <option value="mi">miles</option>
                  <option value="km">km</option>
                  <option value="hr">hours</option>
                </Select>
              </div>
            </Field>
            <Field label="License plate" htmlFor="license_plate">
              <Input
                id="license_plate"
                name="license_plate"
                value={values.license_plate}
                onChange={set("license_plate")}
                className="font-mono tracking-widest uppercase"
              />
            </Field>
            <Field label="Purchase date" htmlFor="purchase_date">
              <Input
                id="purchase_date"
                name="purchase_date"
                type="date"
                value={values.purchase_date}
                onChange={set("purchase_date")}
              />
            </Field>
            <Field label="Purchase price" htmlFor="purchase_price">
              <Input
                id="purchase_price"
                name="purchase_price"
                inputMode="decimal"
                value={values.purchase_price}
                onChange={set("purchase_price")}
                placeholder="$"
              />
            </Field>
            <Field
              label="Odometer at purchase"
              htmlFor="purchase_odometer"
              hint="Used to work out your cost per mile."
            >
              <Input
                id="purchase_odometer"
                name="purchase_odometer"
                inputMode="numeric"
                value={values.purchase_odometer}
                onChange={set("purchase_odometer")}
                className="font-mono"
              />
            </Field>
          </div>
        </Card>

        {/* Custom fields */}
        <Card className="p-5">
          <FormSectionTitle
            n={5}
            title="Your fields"
            sub="Anything else you want to track. Fields you add here appear on every vehicle."
          />
          {visibleCustomFields.length > 0 && (
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              {visibleCustomFields.map((f) => (
                <CustomFieldInput
                  key={f.id}
                  field={f}
                  defaultValue={vehicle?.custom_fields?.[f.id]}
                />
              ))}
            </div>
          )}
          <AddFieldInline
            vehicleType={type}
            onAdded={(field) => setCustomFields((fs) => [...fs, field])}
          />
        </Card>

        <Card className="p-5">
          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              value={values.notes}
              onChange={set("notes")}
              placeholder="Mods, quirks, history…"
            />
          </Field>
        </Card>
      </div>

      {/* Sidebar: photo + save */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="relative aspect-[4/3] bg-panel-2">
            {currentPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentPhoto} alt="Vehicle photo" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setRemovePhoto(true);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex size-full flex-col items-center justify-center gap-2 text-ink-3 hover:text-ink"
              >
                <ImagePlus className="size-10" strokeWidth={1.25} />
                <span className="text-sm font-semibold">Add a photo</span>
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                alert("Photos can be up to 10 MB.");
                return;
              }
              setPhoto({ file, preview: URL.createObjectURL(file) });
              setRemovePhoto(false);
            }}
          />
          {currentPhoto && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-full border-t border-line py-2 text-sm font-semibold text-ink-2 hover:bg-panel-2"
            >
              Replace photo
            </button>
          )}
        </Card>
        <ErrorNote>{state?.error}</ErrorNote>
        <Button
          type="submit"
          variant="primary"
          disabled={pending}
          className="h-12 w-full text-base"
        >
          {pending ? "Saving…" : vehicle ? "Save changes" : "Add to garage"}
        </Button>
      </aside>
    </form>
  );
}

function FormSectionTitle({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <span className="font-mono text-xs font-bold text-accent">{String(n).padStart(2, "0")}</span>
      <div>
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
        {sub && <p className="text-sm text-ink-3">{sub}</p>}
      </div>
    </div>
  );
}

function CustomFieldInput({
  field,
  defaultValue,
}: {
  field: CustomFieldDefinition;
  defaultValue?: string | number | boolean | null;
}) {
  const name = `cf:${field.id}`;
  const value = defaultValue == null ? "" : String(defaultValue);
  return (
    <Field label={field.label} htmlFor={name}>
      <input type="hidden" name={`cftype:${field.id}`} value={field.field_type} />
      {field.field_type === "select" ? (
        <Select id={name} name={name} defaultValue={value}>
          <option value="">—</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : field.field_type === "boolean" ? (
        <Select id={name} name={name} defaultValue={value}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      ) : (
        <Input
          id={name}
          name={name}
          defaultValue={value}
          type={field.field_type === "date" ? "date" : "text"}
          inputMode={field.field_type === "number" ? "decimal" : undefined}
        />
      )}
    </Field>
  );
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "boolean", label: "Yes / No" },
];

export function AddFieldInline({
  vehicleType,
  onAdded,
}: {
  vehicleType?: VehicleType;
  onAdded: (field: CustomFieldDefinition) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [options, setOptions] = useState("");
  const [appliesTo, setAppliesTo] = useState<"all" | VehicleType>("all");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="border border-dashed border-line-strong"
      >
        <Plus className="size-4" /> Add a field
      </Button>
    );
  }

  // Not a nested <form>: this lives inside the vehicle form.
  function save() {
    setError(undefined);
    startSaving(async () => {
      const result = await createCustomField({
        label,
        field_type: fieldType,
        options: options.split(","),
        applies_to: appliesTo,
      });
      if (result.error || !result.field) {
        setError(result.error ?? "Couldn't add that field.");
        return;
      }
      onAdded(result.field);
      setLabel("");
      setOptions("");
      setFieldType("text");
      setOpen(false);
    });
  }

  return (
    <div className="rounded-md border border-dashed border-accent/60 bg-accent-soft/40 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Field name" htmlFor="new-field-label">
          <Input
            id="new-field-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Tire size"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
          />
        </Field>
        <Field label="Type" htmlFor="new-field-type">
          <Select
            id="new-field-type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Show on" htmlFor="new-field-applies">
          <Select
            id="new-field-applies"
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as "all" | VehicleType)}
          >
            <option value="all">All vehicles</option>
            <option value="car">Cars only</option>
            <option value="motorcycle">Motorcycles only</option>
          </Select>
        </Field>
        {fieldType === "select" && (
          <Field
            label="Choices"
            htmlFor="new-field-options"
            hint="Separate with commas."
            className="sm:col-span-3"
          >
            <Input
              id="new-field-options"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Summer, Winter, All-season"
            />
          </Field>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {vehicleType && appliesTo !== "all" && appliesTo !== vehicleType && (
        <p className="mt-2 text-xs text-ink-3">This field won&apos;t show on this vehicle.</p>
      )}
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="primary" onClick={save} disabled={saving}>
          {saving ? "Adding…" : "Add field"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
