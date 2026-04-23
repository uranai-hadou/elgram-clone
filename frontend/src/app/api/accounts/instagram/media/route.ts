export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { instagramAccounts } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();

  const url = new URL(req.url);
  const accountId = url.searchParams.get("account_id");
  if (!accountId)
    return NextResponse.json({ detail: "account_id required" }, { status: 400 });

  const accounts = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.id, accountId));
  if (accounts.length === 0)
    return NextResponse.json({ detail: "Account not found" }, { status: 404 });

  const account = accounts[0];

  // Instagram Login flow uses me/media endpoint
  const res = await fetch(
    `https://graph.instagram.com/v21.0/me/media?fields=id,caption,media_type,thumbnail_url,media_url,timestamp,permalink&limit=50&access_token=${account.accessToken}`
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Instagram media fetch error:", errText);
    return NextResponse.json(
      { detail: "Instagram APIからの取得に失敗しました", error: errText },
      { status: 400 }
    );
  }

  const data = await res.json();
  const media = (data.data || []).map(
    (m: {
      id: string;
      caption?: string;
      media_type: string;
      thumbnail_url?: string;
      media_url?: string;
      timestamp: string;
      permalink?: string;
    }) => ({
      id: m.id,
      caption: m.caption || "",
      media_type: m.media_type,
      thumbnail_url: m.thumbnail_url || m.media_url || "",
      timestamp: m.timestamp,
      permalink: m.permalink || "",
    })
  );

  return NextResponse.json(media);
}
