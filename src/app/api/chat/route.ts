import { NIM_BASE_URL, getNimApiKey } from "@/lib/nim";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  let apiKey: string;
  try {
    apiKey = getNimApiKey();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }

  const body = await request.json();
  const { model, messages } = body as { model?: string; messages?: ChatMessage[] };

  if (!model || !messages || !Array.isArray(messages)) {
    return Response.json(
      { error: "Request body must include 'model' and 'messages'" },
      { status: 400 }
    );
  }

  const upstream = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return Response.json(
      { error: `NIM API error ${upstream.status}: ${text}` },
      { status: upstream.status || 500 }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
