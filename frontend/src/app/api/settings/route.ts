export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq } from "drizzle-orm";

function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 6) return "*".repeat(secret.length);
  return secret.slice(0, 3) + "*".repeat(secret.length - 6) + secret.slice(-3);
}

export async function GET() {
  const userId = await getCurrentUserId();

  let rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
  if (rows.length === 0) {
    const inserted = await db.insert(appSettings).values({ userId }).returning();
    rows = inserted;
  }

  const s = rows[0];
  return NextResponse.json({
    meta_app_id: s.metaAppId || "",
    meta_app_secret_masked: maskSecret(s.metaAppSecret || ""),
    webhook_verify_token: s.webhookVerifyToken || "",
    instagram_redirect_uri: s.instagramRedirectUri || "",
  });
}

export async function PUT(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();

  let rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
  if (rows.length === 0) {
    await db.insert(appSettings).values({ userId });
  }

  const updates: Record<string, string> = {};
  if (body.meta_app_id !== undefined) updates.metaAppId = body.meta_app_id;
  if (body.meta_app_secret !== undefined) updates.metaAppSecret = body.meta_app_secret;
  if (body.webhook_verify_token !== undefined) updates.webhookVerifyToken = body.webhook_verify_token;
  if (body.instagram_redirect_uri !== undefined) updates.instagramRedirectUri = body.instagram_redirect_uri;

  if (Object.keys(updates).length > 0) {
    await db.update(appSettings).set(updates).where(eq(appSettings.userId, userId));
  }

  rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
  const s = rows[0];

  return NextResponse.json({
    meta_app_id: s.metaAppId || "",
    meta_app_secret_masked: maskSecret(s.metaAppSecret || ""),
    webhook_verify_token: s.webhookVerifyToken || "",
    instagram_redirect_uri: s.instagramRedirectUri || "",
  });
}
