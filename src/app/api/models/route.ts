import { getApiBaseUrl, getApiKey } from "@/lib/api";

interface ApiModel {
  id: string;
  object: string;
  owned_by?: string;
}

let cache: { models: ApiModel[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return Response.json({ models: cache.models });
    }

    const apiKey = getApiKey();
    const res = await fetch(`${getApiBaseUrl()}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        { error: `API error ${res.status}: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const models: ApiModel[] = (data.data ?? [])
      .map((m: ApiModel) => ({ id: m.id, object: m.object, owned_by: m.owned_by }))
      .sort((a: ApiModel, b: ApiModel) => a.id.localeCompare(b.id));

    cache = { models, fetchedAt: Date.now() };
    return Response.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
