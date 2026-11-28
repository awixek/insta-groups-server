import { NextResponse } from "next/server";

/**
 * Never send raw database / library error text to the browser (it leaks table
 * and column names). Log the real error server-side, return a generic message.
 */
export function serverError(context: string, err: unknown, status = 500) {
  console.error(`[${context}]`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status });
}

/**
 * For admin actions: a failed write must NOT look like success. Duplicate-link conflicts
 * (unique index on live invite links) get a readable 409, everything else a generic 500.
 */
export function adminDbError(context: string, err: { code?: string; message?: string } | unknown) {
  const e = err as { code?: string };
  if (e?.code === "23505") {
    return NextResponse.json(
      { error: "Another live group already uses this invite link (duplicate). Reject or delete one of them first." },
      { status: 409 }
    );
  }
  return serverError(context, err);
}
