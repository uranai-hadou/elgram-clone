export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST() {
  // Registration is no longer required
  return NextResponse.json({ detail: "Registration disabled" }, { status: 410 });
}
