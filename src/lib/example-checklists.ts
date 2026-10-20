import type { ChecklistTemplate } from "./types";

type Example = Omit<ChecklistTemplate, "id">;

// Starter job checklists users can add from the Checklists page and edit.
export const EXAMPLE_TEMPLATES: Example[] = [
  {
    name: "Oil & filter change (car)",
    description: "Check your manual for oil capacity, grade and drain plug torque.",
    applies_to: "car",
    tools: ["Socket set", "Oil filter wrench", "Drain pan", "Funnel", "Jack & stands or ramps", "Torque wrench", "Gloves & rags"],
    steps: [
      "Warm the engine for a few minutes, then shut it off",
      "Raise the car safely on ramps or stands",
      "Remove the drain plug and drain the oil",
      "Replace the drain plug crush washer and torque the plug to spec",
      "Remove the old filter; wipe the mounting surface",
      "Oil the new filter's gasket and install it hand-tight plus 3/4 turn",
      "Lower the car and fill with the specified oil",
      "Run the engine 30 seconds, check for leaks, then check the dipstick",
      "Reset the oil life monitor and log the mileage",
    ],
  },
  {
    name: "Oil & filter change (motorcycle)",
    description: "Use motorcycle-specific oil (JASO MA/MA2) on wet-clutch bikes.",
    applies_to: "motorcycle",
    tools: ["Socket set", "Oil filter wrench", "Drain pan", "Funnel", "Paddock stand", "Torque wrench"],
    steps: [
      "Warm the engine, then put the bike upright on a stand",
      "Remove the drain plug and drain the oil",
      "Replace the crush washer and torque the drain plug to spec",
      "Replace the oil filter",
      "Fill to the specified level with the correct grade",
      "Run briefly, check for leaks, then check the sight glass or dipstick level",
    ],
  },
  {
    name: "Front brake pads",
    description: "Inspect rotors for minimum thickness while the wheel is off.",
    applies_to: "all",
    tools: ["Jack & stands", "Lug wrench", "Socket set", "C-clamp or piston tool", "Brake cleaner", "Brake grease", "Torque wrench"],
    steps: [
      "Loosen the lug nuts, raise the vehicle and remove the wheel",
      "Remove the caliper bolts and hang the caliper; don't let it hang by the hose",
      "Remove the old pads and hardware",
      "Measure rotor thickness; replace if under minimum",
      "Compress the caliper piston (watch the fluid reservoir level)",
      "Clean and lube the slide pins and pad contact points",
      "Install new hardware and pads, then reinstall the caliper",
      "Torque caliper bolts and lug nuts to spec",
      "Pump the brake pedal until firm before driving",
      "Bed in the new pads",
    ],
  },
  {
    name: "Chain clean & lube",
    applies_to: "motorcycle",
    description: null,
    tools: ["Paddock stand", "Chain cleaner", "Chain brush", "Chain lube", "Rags"],
    steps: [
      "Put the bike on a rear stand",
      "Spray cleaner on the chain while rotating the wheel",
      "Scrub with the chain brush and wipe dry",
      "Apply lube to the inside of the chain run",
      "Check chain slack and adjust to spec",
      "Let the lube set before riding",
    ],
  },
  {
    name: "Tire rotation",
    applies_to: "car",
    description: "Follow the rotation pattern for your tires (directional tires go front-to-back only).",
    tools: ["Jack & stands", "Lug wrench or impact", "Torque wrench", "Tire pressure gauge"],
    steps: [
      "Loosen lug nuts on all wheels",
      "Raise the vehicle and support it safely",
      "Move wheels to their new positions per the rotation pattern",
      "Snug the lug nuts in a star pattern",
      "Lower the vehicle and torque lug nuts to spec",
      "Set tire pressures to the door-jamb placard",
    ],
  },
];
