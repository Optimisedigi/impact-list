import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/time-utils";

function round(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString();
}

export interface HoursStatsProps {
  totalHours: number;
  thisWeekHours: number;
  thisMonthHours: number;
  avgPerLoggedDay: number;
  loggedDays: number;
  sinceDate: string | null;
}

export function HoursStats({
  totalHours,
  thisWeekHours,
  thisMonthHours,
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
    { title: "This week", value: `${round(thisWeekHours)}h`, sub: "Mon–Sun" },
    { title: "This month", value: `${round(thisMonthHours)}h`, sub: "calendar month" },
    {
      title: "Avg per logged day",
      value: `${round(avgPerLoggedDay)}h`,
      sub: `${loggedDays} day${loggedDays === 1 ? "" : "s"} logged`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
