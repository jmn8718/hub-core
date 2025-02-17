/* eslint-disable turbo/no-undeclared-env-vars */
import { type NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import strava from "@/lib/strava";
import db from "@/lib/db";
import { eq, webhooks } from "@repo/db";

export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  try {
    const result = await db.delete(webhooks).where(eq(webhooks.id, id));
    if (result.rowsAffected !== 1)
      return NextResponse.json(
        { error: "Failed to delete logs" },
        { status: 404 },
      );
    return NextResponse.json({ message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error deleting log:", error);
    return NextResponse.json(
      { error: "Failed to delete log" },
      { status: 500 },
    );
  }
}
