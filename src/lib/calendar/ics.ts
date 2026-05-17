import ICAL from "ical.js";

export interface ParsedVevent {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
}

export interface ExpandOptions {
  // Inclusive ISO start of the window to expand recurring events within.
  rangeStart: string;
  // Exclusive ISO end of the window.
  rangeEnd: string;
  // Safety cap so an unbounded RRULE doesn't generate millions of rows.
  maxOccurrences?: number;
}

// Parse all occurrences from an iCalendar component string. For a one-off
// event this is a single-entry array. For an RRULE event we expand every
// occurrence inside the given window and emit one ParsedVevent per
// occurrence with a derived uid suffix so each is its own row.
export function parseVevent(
  ics: string,
  options?: ExpandOptions,
): ParsedVevent[] {
  try {
    const jcal = ICAL.parse(ics);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents("vevent");
    if (vevents.length === 0) return [];

    // The first VEVENT is the recurrence master; any siblings are RECURRENCE-ID
    // overrides. ICAL.Event tracks exceptions automatically when we pass them.
    const master = new ICAL.Event(vevents[0]!);
    for (let i = 1; i < vevents.length; i++) {
      master.relateException(new ICAL.Event(vevents[i]!));
    }

    const baseTitle = master.summary ?? "(no title)";
    const description = master.description ?? null;
    const location = master.location ?? null;
    const baseUid = master.uid;

    // Non-recurring event: emit a single occurrence.
    if (!master.isRecurring()) {
      return [
        toOccurrence(
          baseUid,
          baseTitle,
          description,
          location,
          master.startDate,
          master.endDate ?? master.startDate,
        ),
      ];
    }

    // Recurring event: iterate until we leave the window or hit the safety cap.
    if (!options) {
      // No window provided — just emit the master so callers without a window
      // still get something usable. (Old behaviour for tests.)
      return [
        toOccurrence(
          baseUid,
          baseTitle,
          description,
          location,
          master.startDate,
          master.endDate ?? master.startDate,
        ),
      ];
    }

    const rangeStartTime = ICAL.Time.fromJSDate(
      new Date(options.rangeStart),
      true,
    );
    const rangeEndTime = ICAL.Time.fromJSDate(
      new Date(options.rangeEnd),
      true,
    );
    const cap = options.maxOccurrences ?? 500;
    const iter = master.iterator();
    const out: ParsedVevent[] = [];
    let safety = 0;
    let next: ICAL.Time | null;
    while ((next = iter.next())) {
      if (++safety > cap) break;
      if (next.compare(rangeEndTime) > 0) break;
      const details = master.getOccurrenceDetails(next);
      if (details.endDate.compare(rangeStartTime) < 0) continue;
      out.push(
        toOccurrence(
          // Suffix the UID with the recurrence ID so each occurrence is
          // its own externalId in our DB and gets its own row.
          `${baseUid}::${next.toString()}`,
          details.item.summary ?? baseTitle,
          details.item.description ?? description,
          details.item.location ?? location,
          details.startDate,
          details.endDate,
        ),
      );
    }
    return out;
  } catch {
    return [];
  }
}

function toOccurrence(
  uid: string,
  title: string,
  description: string | null,
  location: string | null,
  start: ICAL.Time,
  end: ICAL.Time,
): ParsedVevent {
  const allDay = start.isDate;
  if (allDay) {
    return {
      uid,
      title,
      description,
      location,
      startsAt: toDateOnly(start),
      endsAt: toDateOnly(end),
      allDay: true,
    };
  }
  return {
    uid,
    title,
    description,
    location,
    startsAt: start.toJSDate().toISOString(),
    endsAt: end.toJSDate().toISOString(),
    allDay: false,
  };
}

function toDateOnly(t: ICAL.Time): string {
  const y = String(t.year).padStart(4, "0");
  const m = String(t.month).padStart(2, "0");
  const d = String(t.day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface SerializeVeventInput {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
}

// Build a minimal VCALENDAR / VEVENT string for CalDAV PUTs.
export function serializeVevent(ev: SerializeVeventInput): string {
  const cal = new ICAL.Component(["vcalendar", [], []]);
  cal.updatePropertyWithValue("prodid", "-//Impact List//EN");
  cal.updatePropertyWithValue("version", "2.0");

  const vevent = new ICAL.Component("vevent");
  vevent.updatePropertyWithValue("uid", ev.uid);
  vevent.updatePropertyWithValue("summary", ev.title);
  if (ev.description) vevent.updatePropertyWithValue("description", ev.description);
  if (ev.location) vevent.updatePropertyWithValue("location", ev.location);
  vevent.updatePropertyWithValue("dtstamp", ICAL.Time.now());

  if (ev.allDay) {
    const start = ICAL.Time.fromDateString(ev.startsAt);
    const end = ICAL.Time.fromDateString(ev.endsAt);
    const dtstart = vevent.updatePropertyWithValue("dtstart", start);
    dtstart.setParameter("value", "DATE");
    const dtend = vevent.updatePropertyWithValue("dtend", end);
    dtend.setParameter("value", "DATE");
  } else {
    vevent.updatePropertyWithValue(
      "dtstart",
      ICAL.Time.fromJSDate(new Date(ev.startsAt), true),
    );
    vevent.updatePropertyWithValue(
      "dtend",
      ICAL.Time.fromJSDate(new Date(ev.endsAt), true),
    );
  }

  cal.addSubcomponent(vevent);
  return cal.toString();
}
