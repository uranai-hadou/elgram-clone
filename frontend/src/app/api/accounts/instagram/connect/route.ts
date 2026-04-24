export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings, instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq } from "drizzle-orm";

const GRAPH = "https://graph.instagram.com";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ detail: "Missing code" }, { status: 400 });

  const settings = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
  if (!settings.length || !settings[0].metaAppId || !settings[0].metaAppSecret) {
    return NextResponse.json({ detail: "Meta設定が未登録です" }, { status: 400 });
  }
  const s = settings[0];

  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: s.metaAppId || "",
      client_secret: s.metaAppSecret || "",
      grant_type: "authorization_code",
      redirect_uri: s.instagramRedirectUri || "",
      code,
    }),
  });

  const tokenText = await tokenRes.text();
  if (!tokenRes.ok) {
    return NextResponse.json({ detail: "Token exchange failed: " + tokenText }, { status: 400 });
  }

  const tokenData = JSON.parse(tokenText);
  const shortToken = tokenData.access_token;
  // Extract user_id from raw text to avoid JS Number precision loss on 17-digit IGSIDs
  const userIdMatch = tokenText.match(/"user_id"\s*:\s*(?:"(\d+)"|(\d+))/);
  const igUserId = userIdMatch ? (userIdMatch[1] || userIdMatch[2]) : String(tokenData.user_id);

  const longRes = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${s.metaAppSecret}&access_token=${shortToken}`
  );
  const longData = await longRes.json();
  const longToken = longData.access_token || shortToken;

  const profileRes = await fetch(
    `${GRAPH}/v21.0/me?fields=user_id,username&access_token=${longToken}`
  );
  const profile = await profileRes.json();
  const username = profile.username || "";

  // Subscribe the IG account to the app so Meta delivers webhook events (comments, DMs).
  // Without this call, the account is linked but no events arrive.
  await fetch(
    `${GRAPH}/v21.0/${igUserId}/subscribed_apps?subscribed_fields=messages,comments&access_token=${longToken}`,
    { method: "POST" }
  ).catch(() => {});

  const existing = await db.select().from(instagramAccounts).where(eq(instagramAccounts.igUserId, igUserId));
  if (existing.length > 0) {
    await db.update(instagramAccounts).set({ accessToken: longToken, username }).where(eq(instagramAccounts.igUserId, igUserId));
    const updated = await db.select().from(instagramAccounts).where(eq(instagramAccounts.igUserId, igUserId));
    return NextResponse.json({ id: updated[0].id, ig_user_id: updated[0].igUserId, username: updated[0].username, created_at: updated[0].createdAt });
  }

  const inserted = await db.insert(instagramAccounts).values({
    userId,
    igUserId,
    username,
    accessToken: longToken,
  }).returning();

  return NextResponse.json({ id: inserted[0].id, ig_user_id: inserted[0].igUserId, username: inserted[0].username, created_at: inserted[0].createdAt });
}
