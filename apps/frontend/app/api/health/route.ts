import { parseHealthResponse } from "@second-brain/schemas";

export function GET() {
  const body = parseHealthResponse({ status: "ok", service: "frontend" });
  return Response.json(body);
}
