import { db } from "@/db";
import { calendarColorLabels } from "@/db/schema";
import { EVENT_COLORS } from "@/lib/constants";

export interface ResolvedColor {
  key: string;
  label: string;       // user override, or default from EVENT_COLORS
  color: string;       // OKLCH value from EVENT_COLORS
  isCustom: boolean;   // true when user has renamed it
}

export async function getResolvedColors(): Promise<ResolvedColor[]> {
  const overrides = await db.select().from(calendarColorLabels);
  const overrideMap = new Map(overrides.map((o) => [o.key, o.label]));
  return EVENT_COLORS.map((c) => {
    const custom = overrideMap.get(c.key);
    return {
      key: c.key,
      label: custom ?? c.label,
      color: c.color,
      isCustom: !!custom,
    };
  });
}
