export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { autorespondRules, messageLogs } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and, count } from "drizzle-orm";

export async function GET() {
  const userId = await getCurrentUserId();

  const totalRules = await db
    .select({ count: count() })
    .from(autorespondRules)
    .where(eq(autorespondRules.userId, userId));

  const activeRules = await db
    .select({ count: count() })
    .from(autorespondRules)
    .where(and(eq(autorespondRules.userId, userId), eq(autorespondRules.isActive, true)));

  const totalResponses = await db
    .select({ count: count() })
    .from(messageLogs)
    .innerJoin(autorespondRules, eq(messageLogs.ruleId, autorespondRules.id))
    .where(and(eq(autorespondRules.userId, userId), eq(messageLogs.direction, "outbound")));

  return NextResponse.json({
    total_rules: totalRules[0].count,
    active_rules: activeRules[0].count,
    total_responses: totalResponses[0].count,
  });
}
