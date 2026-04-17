import { runUploadHandler } from "@/lib/upload/handler"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const result = await runUploadHandler(request)
  if (!result.ok) {
    return new Response(result.body, {
      status: result.status,
      headers: { "content-type": "application/json" },
    })
  }
  return Response.json({ url: result.url })
}
