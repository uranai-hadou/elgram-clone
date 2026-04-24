export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { and, eq } from "drizzle-orm";

const GRAPH = "https://graph.instagram.com";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const rows = await db
    .select()
    .from(instagramAccounts)
    .where(
      and(eq(instagramAccounts.id, id), eq(instagramAccounts.userId, userId))
    );
  if (rows.length === 0) {
    return NextResponse.json({ detail: "Account not found" }, { status: 404 });
  }
  const account = rows[0];

  const url = `${GRAPH}/v21.0/${account.igUserId}/subscribed_apps?subscribed_fields=messages,comments&access_token=${account.accessToken}`;

  let lastData: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    lastData = data;

    if (res.ok) {
      return NextResponse.json({ success: true, meta: data });
    }

    const errObj = (data as { error?: { is_transient?: boolean; code?: number } }).error;
    if (!errObj?.is_transient) break;
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }

  return NextResponse.json(
    { detail: "Subscription failed", meta: lastData },
    { status: 400 }
  );
}
