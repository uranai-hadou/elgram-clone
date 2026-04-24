export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  await db
    .delete(instagramAccounts)
    .where(
      and(eq(instagramAccounts.id, id), eq(instagramAccounts.userId, userId))
    );

  return new NextResponse(null, { status: 204 });
}
