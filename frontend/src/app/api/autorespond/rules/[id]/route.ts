export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { autorespondRules, type MediaTarget } from "@/db/schema";
import { eq } from "drizzle-orm";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.is_active !== undefined) updates.isActive = body.is_active;
  if (body.media_targets !== undefined) {
    const targets: MediaTarget[] = Array.isArray(body.media_targets)
      ? body.media_targets
      : [];
    updates.mediaTargets = targets.length > 0 ? targets : null;
    const primary = targets[0];
    updates.mediaId = primary?.id || null;
    updates.mediaCaption = primary?.caption || null;
    updates.mediaType = primary?.media_type || null;
  } else {
    if (body.media_id !== undefined) updates.mediaId = body.media_id;
    if (body.media_caption !== undefined) updates.mediaCaption = body.media_caption;
    if (body.media_type !== undefined) updates.mediaType = body.media_type;
  }
  if (body.trigger_type !== undefined) updates.triggerType = body.trigger_type;
  if (body.match_type !== undefined) updates.matchType = body.match_type;
  if (body.trigger_keyword !== undefined) updates.triggerKeyword = body.trigger_keyword;
  if (body.response_type !== undefined) updates.responseType = body.response_type;
  if (body.response_message !== undefined) updates.responseMessage = body.response_message;
  if (body.response_image_url !== undefined) updates.responseImageUrl = body.response_image_url;
  if (body.comment_reply_message !== undefined) updates.commentReplyMessage = body.comment_reply_message || null;

  await db.update(autorespondRules).set(updates).where(eq(autorespondRules.id, id));
  const rows = await db.select().from(autorespondRules).where(eq(autorespondRules.id, id));

  return NextResponse.json(toJson(rows[0]));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(autorespondRules).where(eq(autorespondRules.id, id));
  return new NextResponse(null, { status: 204 });
}
