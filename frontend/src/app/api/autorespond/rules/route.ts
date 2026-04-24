export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { autorespondRules, type MediaTarget } from "@/db/schema";
import { getCurrentUserId } from "@/db/auth";
import { eq, desc } from "drizzle-orm";

function toJson(r: typeof autorespondRules.$inferSelect) {
  return {
    id: r.id,
    ig_account_id: r.igAccountId,
    name: r.name,
    is_active: r.isActive,
    media_id: r.mediaId,
    media_caption: r.mediaCaption,
    media_type: r.mediaType,
    media_targets: r.mediaTargets || [],
    target_scope: r.targetScope || "specific",
    trigger_type: r.triggerType,
    match_type: r.matchType,
    trigger_keyword: r.triggerKeyword,
    response_type: r.responseType,
    response_message: r.responseMessage,
    response_image_url: r.responseImageUrl,
    comment_reply_message: r.commentReplyMessage,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export async function GET() {
  const userId = await getCurrentUserId();

  const rows = await db
    .select()
    .from(autorespondRules)
    .where(eq(autorespondRules.userId, userId))
    .orderBy(desc(autorespondRules.createdAt));

  return NextResponse.json(rows.map(toJson));
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  const body = await req.json();

  const scope = body.target_scope || "specific";
  const mediaTargets: MediaTarget[] =
    scope === "specific" && Array.isArray(body.media_targets)
      ? body.media_targets
      : [];

  const primary = mediaTargets[0];

  const inserted = await db
    .insert(autorespondRules)
    .values({
      userId,
      igAccountId: body.ig_account_id,
      name: body.name,
      mediaId: primary?.id || null,
      mediaCaption: primary?.caption || null,
      mediaType: primary?.media_type || null,
      mediaTargets: mediaTargets.length > 0 ? mediaTargets : null,
      targetScope: scope,
      triggerType: body.trigger_type || "comment",
      matchType: body.match_type || "contains",
      triggerKeyword: body.trigger_keyword || "",
      responseType: body.response_type || "dm",
      responseMessage: body.response_message,
      responseImageUrl: body.response_image_url || null,
      commentReplyMessage: body.comment_reply_message || null,
    })
    .returning();

  return NextResponse.json(toJson(inserted[0]), { status: 201 });
}
