import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_EMAIL = "admin@elgram.local";

export async function getCurrentUserId(): Promise<string> {
  // Always return a fixed shared user (no login required)
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEFAULT_EMAIL));

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Auto-create on first access
  const inserted = await db
    .insert(users)
    .values({
      email: DEFAULT_EMAIL,
      passwordHash: "no-login",
      name: "Admin",
    })
    .returning();

  return inserted[0].id;
}
