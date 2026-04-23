export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { imageStore } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ detail: "No file provided" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const inserted = await db.insert(imageStore).values({ data: dataUri }).returning();

  const origin = req.headers.get("x-forwarded-proto") + "://" + req.headers.get("host");
  const url = `${origin}/api/upload?id=${inserted[0].id}`;

  return NextResponse.json({ url });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ detail: "Missing id" }, { status: 400 });

  const rows = await db.select().from(imageStore).where(eq(imageStore.id, id));
  if (rows.length === 0) return NextResponse.json({ detail: "Not found" }, { status: 404 });

  const dataUri = rows[0].data;
  const match = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!match) return NextResponse.json({ detail: "Invalid data" }, { status: 500 });

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
