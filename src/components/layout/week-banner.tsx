import { getBusinessContext } from "@/server/actions/business-context";

const weekQuotes: ((w: number) => string)[] = [
  () => "Lessgoooo!",
  () => "Let's get it!",
  () => "Game on!",
  () => "Full send!",
  () => "Built different",
  () => "Main character energy",
  () => "Stackin' weeks",
  () => "Small steps, big moves",
  () => "Trust the process",
  (w) => `${w} weeks, 0 excuses`,
  () => "Consistency > intensity",
  (w) => `Level ${w} unlocked`,
  () => "What will you build today?",
  () => "Brick by brick",
  () => "1% better",
  () => "Embrace the suck",
  () => "Discipline equals freedom",
  () => "Run it back",
  () => "Time to cook",
];

export async function WeekBanner() {
  const bizContext = await getBusinessContext();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const weekNumber = bizContext?.startDate
    ? Math.floor(
        (new Date(todayStr + "T00:00:00").getTime() -
          new Date(bizContext.startDate + "T00:00:00").getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      ) + 1
    : null;

  if (!weekNumber || weekNumber <= 0) return null;

  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (24 * 60 * 60 * 1000)
  );
  const weekQuote = weekQuotes[dayOfYear % weekQuotes.length](weekNumber);

  return (
    <div className="mb-4 flex items-center justify-end">
      <span className="text-sm md:text-base font-medium text-primary">
        <span className="relative inline-block">
          <svg
            className="pointer-events-none absolute -inset-x-3.5 -top-1 -bottom-3"
            viewBox="0 0 120 44"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <ellipse
              cx="60"
              cy="22"
              rx="56"
              ry="18"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              transform="rotate(-2 60 22)"
              opacity="0.6"
            />
          </svg>
          Week {weekNumber}
        </span>
        <span className="hidden md:inline">
          {bizContext?.businessName ? ` of ${bizContext.businessName}` : ""} —{" "}
        </span>
        <span className="md:hidden"> — </span>
        {weekQuote}
      </span>
    </div>
  );
}
