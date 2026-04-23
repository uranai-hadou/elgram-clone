export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { broadcastJobs } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");

  if (jobId) {
    const jobs = await db
      .select()
      .from(broadcastJobs)
      .where(and(eq(broadcastJobs.id, jobId), eq(broadcastJobs.userId, userId)));

    if (jobs.length === 0)
      return NextResponse.json({ detail: "Job not found" }, { status: 404 });

    const job = jobs[0];
    const recipients = job.recipients as string[];

    // If pending and past nextBatchAt, trigger processing
    if (
      job.status === "pending" &&
      job.nextBatchAt &&
      new Date() >= new Date(job.nextBatchAt) &&
      (job.nextBatchIndex || 0) < recipients.length
    ) {
      const baseUrl =
        req.headers.get("x-forwarded-proto") + "://" + req.headers.get("host");
      fetch(`${baseUrl}/api/broadcast/process?job_id=${jobId}`, {
        method: "POST",
      }).catch(() => {});
    }

    return NextResponse.json({
      job_id: job.id,
      status: job.status,
      sent: job.sent,
      failed: job.failed,
      total: job.total,
      remaining: recipients.length - (job.nextBatchIndex || 0),
      next_batch_at: job.status === "completed" ? null : job.nextBatchAt,
      created_at: job.createdAt,
    });
  }

  // List recent jobs
  const jobs = await db
    .select()
    .from(broadcastJobs)
    .where(eq(broadcastJobs.userId, userId))
    .orderBy(desc(broadcastJobs.createdAt))
    .limit(10);

  return NextResponse.json(
    jobs.map((job) => ({
      job_id: job.id,
      status: job.status,
      sent: job.sent,
      failed: job.failed,
      total: job.total,
      message: job.message.slice(0, 50) + (job.message.length > 50 ? "..." : ""),
      created_at: job.createdAt,
    }))
  );
}
