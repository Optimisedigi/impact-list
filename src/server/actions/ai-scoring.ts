"use server";

import { revalidatePath } from "next/cache";

export async function triggerAiScoring() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/ai/score`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "AI scoring failed");
  }

  revalidatePath("/tasks");
  revalidatePath("/focus");
  return data;
}
