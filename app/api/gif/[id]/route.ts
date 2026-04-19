export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const apiKey = process.env.WORKOUTX_API_KEY;
  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }

  const { id } = params;
  // Sanitize: only allow alphanumeric + dots
  if (!/^[\w.]+$/.test(id)) {
    return new Response("Invalid id", { status: 400 });
  }

  const upstream = `https://api.workoutxapp.com/v1/gifs/${id}.gif`;

  try {
    const res = await fetch(upstream, {
      headers: { "X-WorkoutX-Key": apiKey },
    });

    if (!res.ok) {
      return new Response(null, { status: res.status });
    }

    const body = await res.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new Response("Failed to fetch GIF", { status: 502 });
  }
}
