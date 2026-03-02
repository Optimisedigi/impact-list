import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { growthPhases, categoryTargets } from "./schema";

async function seed() {
  const client = createClient({ url: "file:./local.db" });
  const db = drizzle(client);

  console.log("Seeding growth phases...");
  await db.insert(growthPhases).values([
    {
      name: "Phase 1: Foundation",
      description: "Build core infrastructure, establish recurring revenue, create initial content portfolio",
      focusAreas: "Client delivery, systems setup, first content pieces",
      isActive: true,
      sortOrder: 0,
    },
    {
      name: "Phase 2: Growth",
      description: "Scale content output, build audience, increase client pipeline",
      focusAreas: "Content velocity, audience building, referral systems",
      isActive: false,
      sortOrder: 1,
    },
    {
      name: "Phase 3: Leverage",
      description: "Productize services, create passive income streams, delegate operations",
      focusAreas: "Productization, automation, delegation",
      isActive: false,
      sortOrder: 2,
    },
    {
      name: "Phase 4: Scale",
      description: "Expand team, launch products, optimize for margin",
      focusAreas: "Hiring, product launches, profit optimization",
      isActive: false,
      sortOrder: 3,
    },
  ]);

  console.log("Seeding category targets...");
  await db.insert(categoryTargets).values([
    { category: "client_delivery", targetPercentage: 40 },
    { category: "systems_automation", targetPercentage: 20 },
    { category: "client_growth", targetPercentage: 15 },
    { category: "team_management", targetPercentage: 15 },
    { category: "admin", targetPercentage: 10 },
  ]);

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
