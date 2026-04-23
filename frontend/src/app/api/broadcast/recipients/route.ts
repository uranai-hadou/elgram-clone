export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageLogs, instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and, gte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const accountId = url.searchParams.get("account_id");
  if (!accountId)
    return NextResponse.json({ detail: "account_id required" }, { status: 400 });

  // Verify account ownership
  const accounts = await db
    .select()
    .from(instagramAccounts)
    .where(
      and(eq(instagramAccounts.id, accountId), eq(instagramAccounts.userId, userId))
    );
  if (accounts.length === 0)
    return NextResponse.json({ detail: "Account not found" }, { status: 404 });

  // Get unique users who sent DMs in the last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recipients = await db
    .selectDistinctOn([messageLogs.senderIgId], {
      senderIgId: messageLogs.senderIgId,
      lastMessage: sql<string>`MAX(${messageLogs.content})`,
      lastAt: sql<string>`MAX(${messageLogs.createdAt})`,
    })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.igAccountId, accountId),
        eq(messageLogs.direction, "inbound"),
        eq(messageLogs.messageType, "dm"),
        gte(messageLogs.createdAt, since)
      )
    )
    .groupBy(messageLogs.senderIgId);

  return NextResponse.json({
    recipients: recipients.map((r) => ({
      ig_user_id: r.senderIgId,
      last_message_at: r.lastAt,
    })),
    count: recipients.length,
  });
}
