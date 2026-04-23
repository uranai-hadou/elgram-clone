export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageLogs, instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and, sql, gte } from "drizzle-orm";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Get user's accounts
  const accounts = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.userId, userId));

  if (accounts.length === 0) {
    return NextResponse.json({ accounts: [], daily: [] });
  }

  const accountIds = accounts.map((a) => a.id);

  // Get daily outbound counts per account
  const rows = await db
    .select({
      date: sql<string>`DATE(${messageLogs.createdAt})`.as("date"),
      igAccountId: messageLogs.igAccountId,
      count: sql<number>`COUNT(*)`.as("count"),
    })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.direction, "outbound"),
        gte(messageLogs.createdAt, since),
        sql`${messageLogs.igAccountId} IN (${sql.join(
          accountIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      )
    )
    .groupBy(sql`DATE(${messageLogs.createdAt})`, messageLogs.igAccountId)
    .orderBy(sql`DATE(${messageLogs.createdAt})`);

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      username: a.username,
    })),
    daily: rows.map((r) => ({
      date: r.date,
      account_id: r.igAccountId,
      count: Number(r.count),
    })),
  });
}
