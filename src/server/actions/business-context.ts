"use server";

import { db } from "@/db";
import { businessContext } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface BusinessContextData {
  businessName: string;
  businessDescription: string;
  toolsUsed: string;
  teamSize: string;
  revenueModel: string;
  startDate: string;
}

export async function getBusinessContext(): Promise<BusinessContextData | null> {
  const rows = await db.select().from(businessContext).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    businessName: row.businessName ?? "",
    businessDescription: row.businessDescription ?? "",
    toolsUsed: row.toolsUsed ?? "",
    teamSize: row.teamSize ?? "",
    revenueModel: row.revenueModel ?? "",
    startDate: row.startDate ?? "",
  };
}

export async function saveBusinessContext(data: BusinessContextData) {
  const existing = await db.select().from(businessContext).limit(1);
  if (existing.length > 0) {
    await db
      .update(businessContext)
      .set({
        businessName: data.businessName,
        businessDescription: data.businessDescription,
        toolsUsed: data.toolsUsed,
        teamSize: data.teamSize,
        revenueModel: data.revenueModel,
        startDate: data.startDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(businessContext.id, existing[0].id));
  } else {
    await db.insert(businessContext).values({
      businessName: data.businessName,
      businessDescription: data.businessDescription,
      toolsUsed: data.toolsUsed,
      teamSize: data.teamSize,
      revenueModel: data.revenueModel,
      startDate: data.startDate,
    });
  }
}
