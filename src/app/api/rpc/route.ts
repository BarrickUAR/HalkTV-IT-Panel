import { NextRequest, NextResponse } from "next/server";
import { fetchContacts, fetchThread, unreadMessageCount, markThreadRead } from "@/app/(app)/messages/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    if (action === "fetchContacts") {
      const result = await fetchContacts(payload?.q);
      return NextResponse.json(result);
    }
    if (action === "fetchThread") {
      const result = await fetchThread(payload?.id);
      return NextResponse.json(result);
    }
    if (action === "unreadMessageCount") {
      const result = await unreadMessageCount();
      return NextResponse.json(result);
    }
    if (action === "markThreadRead") {
      const result = await markThreadRead(payload?.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
