export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function POST() {
  // Login is no longer required
  return NextResponse.json({ detail: "Login disabled" }, { status: 410 });
}
