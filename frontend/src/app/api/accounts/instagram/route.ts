export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const userId = await getCurrentUserId();

  const rows = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.userId, userId));

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      ig_user_id: r.igUserId,
      username: r.username,
      created_at: r.createdAt,
    }))
  );
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const accountId = url.pathname.split("/").pop();

  await db
    .delete(instagramAccounts)
    .where(
      and(
        eq(instagramAccounts.id, accountId!),
        eq(instagramAccounts.userId, userId)
      )
    );

  return new NextResponse(null, { status: 204 });
}
