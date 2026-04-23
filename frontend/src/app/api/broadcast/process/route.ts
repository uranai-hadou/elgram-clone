export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { broadcastJobs, instagramAccounts, messageLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

const GRAPH = "https://graph.instagram.com/v21.0";
const BATCH_SIZE = 200;

async function sendDM(
  accessToken: string,
  igUserId: string,
  recipientId: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${igUserId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.error?.message || "Send failed" };
    }
    const data = await res.json();
    return { success: true, messageId: data.message_id };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId)
    return NextResponse.json({ detail: "job_id required" }, { status: 400 });

  // Get job
  const jobs = await db.select().from(broadcastJobs).where(eq(broadcastJobs.id, jobId));
  if (jobs.length === 0)
    return NextResponse.json({ detail: "Job not found" }, { status: 404 });

  const job = jobs[0];

  if (job.status === "completed")
    return NextResponse.json({ detail: "Job already completed" });

  // Check if it's time to process
  if (job.nextBatchAt && new Date() < new Date(job.nextBatchAt)) {
    return NextResponse.json({ detail: "Too early for next batch", nextBatchAt: job.nextBatchAt });
  }

  // Get account
  const accounts = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.id, job.igAccountId));
  if (accounts.length === 0)
    return NextResponse.json({ detail: "Account not found" }, { status: 404 });

  const account = accounts[0];
  const recipients = job.recipients as string[];
  const startIndex = job.nextBatchIndex || 0;
  const batch = recipients.slice(startIndex, startIndex + BATCH_SIZE);

  if (batch.length === 0) {
    await db
      .update(broadcastJobs)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(broadcastJobs.id, jobId));
    return NextResponse.json({ detail: "No more recipients" });
  }

  // Mark as processing
  await db
    .update(broadcastJobs)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(broadcastJobs.id, jobId));

  let sent = job.sent || 0;
  let failed = job.failed || 0;

  for (const recipientId of batch) {
    const result = await sendDM(
      account.accessToken,
      account.igUserId,
      recipientId,
      job.message
    );

    if (result.success) {
      sent++;

      // Send image if configured
      if (job.imageUrl) {
        await fetch(`${GRAPH}/${account.igUserId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { attachment: { type: "image", payload: { url: job.imageUrl } } },
          }),
        });
      }

      await db.insert(messageLogs).values({
        igAccountId: account.id,
        direction: "outbound",
        messageType: "dm",
        senderIgId: account.igUserId,
        content: job.message + (job.imageUrl ? " [画像あり]" : ""),
        igMessageId: result.messageId || null,
      });
    } else {
      failed++;
    }

    // Small delay between messages
    if (batch.indexOf(recipientId) < batch.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const newIndex = startIndex + batch.length;
  const isComplete = newIndex >= recipients.length;

  await db
    .update(broadcastJobs)
    .set({
      sent,
      failed,
      nextBatchIndex: newIndex,
      status: isComplete ? "completed" : "pending",
      nextBatchAt: isComplete ? null : new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      updatedAt: new Date(),
    })
    .where(eq(broadcastJobs.id, jobId));

  // Schedule next batch if not complete
  if (!isComplete) {
    const baseUrl =
      req.headers.get("x-forwarded-proto") + "://" + req.headers.get("host");

    // Use setTimeout-like approach: call ourselves after 1 hour
    // In serverless, we schedule via a delayed fetch
    setTimeout(() => {
      fetch(`${baseUrl}/api/broadcast/process?job_id=${jobId}`, {
        method: "POST",
      }).catch(() => {});
    }, 60 * 60 * 1000);
  }

  return NextResponse.json({
    job_id: jobId,
    batch_sent: batch.length,
    total_sent: sent,
    total_failed: failed,
    remaining: recipients.length - newIndex,
    status: isComplete ? "completed" : "waiting_next_batch",
    next_batch_at: isComplete ? null : new Date(Date.now() + 60 * 60 * 1000),
  });
}
