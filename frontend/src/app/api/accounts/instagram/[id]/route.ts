export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  instagramAccounts,
  autorespondRules,
  messageLogs,
  broadcastJobs,
} from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  // Cascade: remove dependent records first (schema has no ON DELETE CASCADE)
  await db.delete(messageLogs).where(eq(messageLogs.igAccountId, id));
  await db.delete(autorespondRules).where(eq(autorespondRules.igAccountId, id));
  await db.delete(broadcastJobs).where(eq(broadcastJobs.igAccountId, id));

  await db
    .delete(instagramAccounts)
    .where(
      and(eq(instagramAccounts.id, id), eq(instagramAccounts.userId, userId))
    );

  return new NextResponse(null, { status: 204 });
}
