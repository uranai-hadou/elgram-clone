export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { and, eq } from "drizzle-orm";

const GRAPH = "https://graph.instagram.com";

export async function GET(
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

  // Check subscribed apps (what fields are we subscribed to at Meta)
  const subsRes = await fetch(
    `${GRAPH}/v21.0/${account.igUserId}/subscribed_apps?access_token=${account.accessToken}`
  );
  const subs = await subsRes.json().catch(() => ({}));

  // Check basic profile to verify token is valid
  const meRes = await fetch(
    `${GRAPH}/v21.0/me?fields=user_id,username,account_type&access_token=${account.accessToken}`
  );
  const me = await meRes.json().catch(() => ({}));

  return NextResponse.json({
    stored: {
      ig_user_id: account.igUserId,
      username: account.username,
      token_prefix: account.accessToken.slice(0, 20) + "...",
    },
    meta_me: me,
    meta_subscribed_apps: subs,
  });
}
