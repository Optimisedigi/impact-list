import { getLifeWeeksSettings } from "@/server/actions/life-weeks";
import { LifeWeeksView } from "./components/life-weeks-view";

export default async function LifeWeeksPage() {
  const settings = await getLifeWeeksSettings();
  return <LifeWeeksView initial={settings} />;
}
