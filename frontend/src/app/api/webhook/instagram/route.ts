export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appSettings, instagramAccounts, autorespondRules, messageLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const GRAPH = "https://graph.instagram.com/v21.0";

function matchesRule(matchType: string, keyword: string, text: string): boolean {
  if (!keyword) return true; // empty keyword = match all
  const lowerText = text.toLowerCase();
  const lowerKw = keyword.toLowerCase();
  if (matchType === "exact") return lowerText.trim() === lowerKw.trim();
  if (matchType === "contains") return lowerText.includes(lowerKw);
  if (matchType === "regex") return new RegExp(keyword, "i").test(text);
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe") return new NextResponse("Forbidden", { status: 403 });

  const allSettings = await db.select().from(appSettings);
  for (const s of allSettings) {
    if (s.webhookVerifyToken && s.webhookVerifyToken === token) {
      return new NextResponse(challenge, { status: 200 });
    }
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  // Parse as text first so we can extract large integer IDs without JS Number precision loss
  const rawText = await req.text();
  const body = JSON.parse(rawText);
  console.log("[webhook] received:", rawText);

  // Extract entry.id values in order as strings from raw text
  const entryIdMatches = [...rawText.matchAll(/"entry"\s*:\s*\[([\s\S]*?)\]/g)];
  const entryIds: string[] = [];
  if (entryIdMatches.length > 0) {
    const inner = entryIdMatches[0][1];
    const idMatches = [...inner.matchAll(/"id"\s*:\s*(?:"(\d+)"|(\d+))/g)];
    for (const m of idMatches) entryIds.push(m[1] || m[2]);
  }

  type Entry = {
    id?: string | number;
    changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
    messaging?: Array<Record<string, unknown>>;
  };
  const entries: Array<{ entry: Entry; igUserId: string }> = [];
  (body.entry || []).forEach((e: Entry, i: number) => {
    entries.push({ entry: e, igUserId: entryIds[i] || String(e.id || "") });
  });

  for (const { entry, igUserId } of entries) {

    const accounts = await db.select().from(instagramAccounts).where(eq(instagramAccounts.igUserId, igUserId));
    if (accounts.length === 0) {
      console.warn(`[webhook] no account match for igUserId=${igUserId}. Stored IDs:`,
        (await db.select({ id: instagramAccounts.igUserId }).from(instagramAccounts)).map((r) => r.id));
      continue;
    }
    const account = accounts[0];

    // Comments
    for (const change of entry.changes || []) {
      if (change.field !== "comments") continue;
      const v = (change.value || {}) as Record<string, unknown>;
      const text = (v.text as string) || "";
      const senderId = ((v.from as Record<string, unknown> | undefined)?.id as string) || "";
      const commentId = (v.id as string) || "";

      await db.insert(messageLogs).values({
        igAccountId: account.id,
        direction: "inbound",
        messageType: "comment",
        senderIgId: senderId,
        content: text,
        igMessageId: commentId,
      });

      const mediaId = ((v.media as Record<string, unknown> | undefined)?.id as string) || "";

      const rules = await db.select().from(autorespondRules).where(
        and(eq(autorespondRules.igAccountId, account.id), eq(autorespondRules.isActive, true), eq(autorespondRules.triggerType, "comment"))
      );

      // Cache media_type lookups per webhook batch
      let cachedMediaType: string | null = null;
      const getMediaType = async (): Promise<string | null> => {
        if (cachedMediaType !== null || !mediaId) return cachedMediaType;
        try {
          const r = await fetch(`https://graph.instagram.com/${mediaId}?fields=media_type&access_token=${account.accessToken}`);
          const d = await r.json();
          cachedMediaType = (d?.media_type as string) || "";
        } catch {
          cachedMediaType = "";
        }
        return cachedMediaType;
      };

      for (const rule of rules) {
        const scope = rule.targetScope || "specific";
        if (scope === "all") {
          // match any post
        } else if (scope === "feeds" || scope === "reels") {
          const mt = await getMediaType();
          if (scope === "feeds" && mt === "VIDEO") continue;
          if (scope === "reels" && mt !== "VIDEO") continue;
        } else {
          // specific: use media_targets / legacy mediaId
          const targets = (rule.mediaTargets || []) as { id: string }[];
          if (targets.length > 0) {
            if (!targets.some((t) => t.id === mediaId)) continue;
          } else if (rule.mediaId && rule.mediaId !== mediaId) {
            continue;
          }
        }
        if (!matchesRule(rule.matchType || "contains", rule.triggerKeyword || "", text)) continue;

        if (rule.responseType === "comment_reply") {
          const res = await fetch(`${GRAPH}/${commentId}/replies?access_token=${account.accessToken}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `message=${encodeURIComponent(rule.responseMessage)}` });
          const data = await res.json();
          await db.insert(messageLogs).values({
            igAccountId: account.id,
            ruleId: rule.id,
            direction: "outbound",
            messageType: "comment_reply",
            senderIgId: account.igUserId,
            content: rule.responseMessage,
            igMessageId: data.id || "",
          });
        } else {
          // Optional public comment reply BEFORE sending DM
          if (rule.commentReplyMessage) {
            const res = await fetch(`${GRAPH}/${commentId}/replies?access_token=${account.accessToken}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `message=${encodeURIComponent(rule.commentReplyMessage)}` });
            const data = await res.json();
            await db.insert(messageLogs).values({
              igAccountId: account.id,
              ruleId: rule.id,
              direction: "outbound",
              messageType: "comment_reply",
              senderIgId: account.igUserId,
              content: rule.commentReplyMessage,
              igMessageId: data.id || "",
            });
          }

          // Send DM
          const res = await fetch(`${GRAPH}/${account.igUserId}/messages?access_token=${account.accessToken}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: senderId }, message: { text: rule.responseMessage } }) });
          const data = await res.json();

          if (rule.responseImageUrl) {
            await fetch(`${GRAPH}/${account.igUserId}/messages?access_token=${account.accessToken}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: senderId }, message: { attachment: { type: "image", payload: { url: rule.responseImageUrl } } } }) });
          }

          await db.insert(messageLogs).values({
            igAccountId: account.id,
            ruleId: rule.id,
            direction: "outbound",
            messageType: "dm",
            senderIgId: account.igUserId,
            content: rule.responseMessage + (rule.responseImageUrl ? ` [画像: ${rule.responseImageUrl}]` : ""),
            igMessageId: data.message_id || "",
          });
        }
        break;
      }
    }

    // DMs
    for (const messaging of entry.messaging || []) {
      const message = (messaging as Record<string, unknown>).message as
        | { is_echo?: boolean; text?: string; mid?: string }
        | undefined;
      if (!message || message.is_echo) continue;
      const text = message.text || "";
      const senderId =
        (((messaging as Record<string, unknown>).sender as
          | Record<string, unknown>
          | undefined)?.id as string) || "";

      await db.insert(messageLogs).values({
        igAccountId: account.id,
        direction: "inbound",
        messageType: "dm",
        senderIgId: senderId,
        content: text,
        igMessageId: message.mid || "",
      });

      const rules = await db.select().from(autorespondRules).where(
        and(eq(autorespondRules.igAccountId, account.id), eq(autorespondRules.isActive, true), eq(autorespondRules.triggerType, "dm"))
      );

      for (const rule of rules) {
        if (!matchesRule(rule.matchType || "contains", rule.triggerKeyword || "", text)) continue;

        const res = await fetch(`${GRAPH}/${account.igUserId}/messages?access_token=${account.accessToken}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: senderId }, message: { text: rule.responseMessage } }) });
        const data = await res.json();

        // Send image if configured
        if (rule.responseImageUrl) {
          await fetch(`${GRAPH}/${account.igUserId}/messages?access_token=${account.accessToken}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: senderId }, message: { attachment: { type: "image", payload: { url: rule.responseImageUrl } } } }) });
        }

        await db.insert(messageLogs).values({
          igAccountId: account.id,
          ruleId: rule.id,
          direction: "outbound",
          messageType: "dm",
          senderIgId: account.igUserId,
          content: rule.responseMessage + (rule.responseImageUrl ? ` [画像: ${rule.responseImageUrl}]` : ""),
          igMessageId: data.message_id || "",
        });
        break;
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
