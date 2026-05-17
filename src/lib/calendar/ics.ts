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

// Parse the first VEVENT out of an iCalendar component string.
export function parseVevent(ics: string): ParsedVevent | null {
  try {
    const jcal = ICAL.parse(ics);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent("vevent");
    if (!vevent) return null;
    const ev = new ICAL.Event(vevent);

    const uid = ev.uid;
    const summary = ev.summary ?? "(no title)";
    const description = ev.description ?? null;
    const location = ev.location ?? null;
    const start = ev.startDate;
    const end = ev.endDate ?? start;
    const allDay = start.isDate;

    if (allDay) {
      return {
        uid,
        title: summary,
        description,
        location,
        startsAt: toDateOnly(start),
        endsAt: toDateOnly(end),
        allDay: true,
      };
    }
    return {
      uid,
      title: summary,
      description,
      location,
      startsAt: start.toJSDate().toISOString(),
      endsAt: end.toJSDate().toISOString(),
      allDay: false,
    };
  } catch {
    return null;
  }
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
