import { startJob } from "@/lib/server/jobs";
import type { JobRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JobRequest;
    const id = await startJob(body);
    return Response.json({ id });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Could not start job" },
      { status: 400 },
    );
  }
}
