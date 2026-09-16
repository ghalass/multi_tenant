// app/api/auth/permissions/route.ts
import { NextResponse } from "next/server";
// import { getCurrentUserId } from "@/lib/auth";
import { getUserPermissions } from "@/lib/rbac/core";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const userId = session?.userId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await getUserPermissions(userId);

  return NextResponse.json({ permissions });
}
