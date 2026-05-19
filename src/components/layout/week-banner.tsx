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

// Format a tenure measured in whole weeks as months + weeks.
// One month = 4 weeks. Two weeks reads as "½ month".
// Examples:
//   1 week   → "1 week"
//   3 weeks  → "3 weeks"
//   4 weeks  → "1 month"
//   6 weeks  → "1½ months"
//   9 weeks  → "2 months, 1 week"
//  10 weeks  → "2½ months"
//  11 weeks  → "2 months, 3 weeks"
function formatTenure(totalWeeks: number): string {
  if (totalWeeks < 4) {
    return `${totalWeeks} ${totalWeeks === 1 ? "week" : "weeks"}`;
  }
  const months = Math.floor(totalWeeks / 4);
  const remainder = totalWeeks % 4;
  const monthsLabel = (n: number, half: boolean) => {
    const text = half ? `${n}½` : `${n}`;
    const plural = n > 1 || half;
    return `${text} ${plural ? "months" : "month"}`;
  };
  if (remainder === 0) return monthsLabel(months, false);
  if (remainder === 2) return monthsLabel(months, true);
  const weeksLabel = `${remainder} ${remainder === 1 ? "week" : "weeks"}`;
  return `${monthsLabel(months, false)}, ${weeksLabel}`;
}

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
  const tenureLabel = formatTenure(weekNumber);

  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (24 * 60 * 60 * 1000)
  );
  const weekQuote = weekQuotes[dayOfYear % weekQuotes.length](weekNumber);

  return (
    <div className="mb-0 flex min-w-0 items-center justify-end md:mb-4">
      <span className="min-w-0 truncate text-xs md:text-base font-medium text-primary md:whitespace-normal">
        <span className="relative inline-block">{tenureLabel}</span>
        <span className="hidden md:inline">
          {bizContext?.businessName ? ` of ${bizContext.businessName}` : ""} —{" "}
        </span>
        <span className="md:hidden"> — </span>
        <span className="text-black">{weekQuote}</span>
      </span>
    </div>
  );
}
