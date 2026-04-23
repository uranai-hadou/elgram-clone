export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageLogs, instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and, gte, lte, desc, sql, like } from "drizzle-orm";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const accountId = url.searchParams.get("account_id");
  const direction = url.searchParams.get("direction"); // inbound | outbound
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const search = url.searchParams.get("search");
  const limit = parseInt(url.searchParams.get("limit") || "100", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  // Get user's accounts
  const accounts = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.userId, userId));

  if (accounts.length === 0) {
    return NextResponse.json({ logs: [], total: 0, accounts: [] });
  }

  const accountIds = accounts.map((a) => a.id);

  const conditions = [
    sql`${messageLogs.igAccountId} IN (${sql.join(
      accountIds.map((id) => sql`${id}`),
      sql`, `
    )})`,
  ];

  if (accountId) {
    conditions.push(eq(messageLogs.igAccountId, accountId));
  }
  if (direction) {
    conditions.push(eq(messageLogs.direction, direction));
  }
  if (dateFrom) {
    conditions.push(gte(messageLogs.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    conditions.push(lte(messageLogs.createdAt, to));
  }
  if (search) {
    conditions.push(like(messageLogs.content, `%${search}%`));
  }

  const where = and(...conditions);

  const rows = await db
    .select()
    .from(messageLogs)
    .where(where)
    .orderBy(desc(messageLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(messageLogs)
    .where(where);

  return NextResponse.json({
    logs: rows.map((r) => ({
      id: r.id,
      account_id: r.igAccountId,
      account_username: accounts.find((a) => a.id === r.igAccountId)?.username || "",
      direction: r.direction,
      message_type: r.messageType,
      sender_ig_id: r.senderIgId,
      content: r.content,
      created_at: r.createdAt,
    })),
    total: Number(countResult[0].count),
    accounts: accounts.map((a) => ({ id: a.id, username: a.username })),
  });
}
