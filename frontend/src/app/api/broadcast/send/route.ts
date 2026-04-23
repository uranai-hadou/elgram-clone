export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { messageLogs, instagramAccounts, broadcastJobs } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and, gte } from "drizzle-orm";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();

  const body = await req.json();
  const { account_id, message, image_url } = body;

  if (!account_id || !message) {
    return NextResponse.json(
      { detail: "account_id and message are required" },
      { status: 400 }
    );
  }

  const accounts = await db
    .select()
    .from(instagramAccounts)
    .where(
      and(eq(instagramAccounts.id, account_id), eq(instagramAccounts.userId, userId))
    );
  if (accounts.length === 0)
    return NextResponse.json({ detail: "Account not found" }, { status: 404 });

  // Get unique DM senders from last 24 hours
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .selectDistinctOn([messageLogs.senderIgId], {
      senderIgId: messageLogs.senderIgId,
    })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.igAccountId, account_id),
        eq(messageLogs.direction, "inbound"),
        eq(messageLogs.messageType, "dm"),
        gte(messageLogs.createdAt, since)
      )
    )
    .groupBy(messageLogs.senderIgId);

  const recipients = rows.map((r) => r.senderIgId);

  if (recipients.length === 0) {
    return NextResponse.json({
      detail: "24時間以内にDMを送ってきたユーザーがいません",
    }, { status: 400 });
  }

  // Create broadcast job
  const inserted = await db
    .insert(broadcastJobs)
    .values({
      userId,
      igAccountId: account_id,
      message: message.trim(),
      imageUrl: image_url || null,
      recipients,
      status: "pending",
      sent: 0,
      failed: 0,
      total: recipients.length,
      nextBatchIndex: 0,
      nextBatchAt: new Date(), // start immediately
    })
    .returning();

  const job = inserted[0];

  // Trigger first batch processing immediately
  const baseUrl = req.headers.get("x-forwarded-proto") + "://" + req.headers.get("host");
  fetch(`${baseUrl}/api/broadcast/process?job_id=${job.id}`, {
    method: "POST",
  }).catch(() => {}); // fire and forget

  return NextResponse.json({
    job_id: job.id,
    total: recipients.length,
    status: "pending",
    batches: Math.ceil(recipients.length / 200),
    estimated_minutes: Math.ceil(recipients.length / 200) * 60,
  });
}
