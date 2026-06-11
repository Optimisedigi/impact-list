import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/time-utils";

function round(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString();
}

export interface HoursStatsProps {
  totalHours: number;
  avgPerWeek: number;
  loggedWeeks: number;
  avgPerMonth: number;
  loggedMonths: number;
  avgPerLoggedDay: number;
  loggedDays: number;
  sinceDate: string | null;
}

export function HoursStats({
  totalHours,
  avgPerWeek,
  loggedWeeks,
  avgPerMonth,
  loggedMonths,
  avgPerLoggedDay,
  loggedDays,
  sinceDate,
}: HoursStatsProps): React.ReactElement {
  const cards = [
    {
      title: "Total hours",
      value: `${round(totalHours)}h`,
      sub: sinceDate ? `since ${formatDate(sinceDate)}` : "all time",
    },
    {
      title: "Avg per week",
      value: `${round(avgPerWeek)}h`,
      sub: `${loggedWeeks} week${loggedWeeks === 1 ? "" : "s"} logged`,
    },
    {
      title: "Avg per month",
      value: `${round(avgPerMonth)}h`,
      sub: `${loggedMonths} month${loggedMonths === 1 ? "" : "s"} logged`,
    },
    {
      title: "Avg per logged day",
      value: `${round(avgPerLoggedDay)}h`,
      sub: `${loggedDays} day${loggedDays === 1 ? "" : "s"} logged`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="gap-0 py-4">
          <CardContent className="space-y-0.5">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <div className="text-2xl font-bold tabular-nums leading-tight">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
