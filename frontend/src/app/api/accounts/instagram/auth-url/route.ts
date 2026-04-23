export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getCurrentUserId();

  const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
  if (rows.length === 0 || !rows[0].metaAppId) {
    return NextResponse.json(
      { detail: "Meta App IDを設定画面で先に登録してください" },
      { status: 400 }
    );
  }

  const s = rows[0];
  const url =
    `https://www.instagram.com/oauth/authorize` +
    `?enable_fb_login=0` +
    `&force_authentication=1` +
    `&client_id=${s.metaAppId}` +
    `&redirect_uri=${encodeURIComponent(s.instagramRedirectUri || "")}` +
    `&response_type=code` +
    `&scope=instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages`;

  return NextResponse.json({ auth_url: url });
}
