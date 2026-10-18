import { BACKEND_URL } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = await getSessionUser();
  if (user) {
    url.searchParams.set("userId", user.id);
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/composio/oauth${url.search}`);
    if (backendRes.ok) {
      return new Response(await backendRes.text(), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch {}

  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  const title = error ? "Couldn't sign in to Composio" : "You're signed in to Composio";
  const body = error ? error : "Your dots can use your apps now. You can close this tab and go back to Soli.";

  return new Response(`<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1><p>${body}</p></body></html>`, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
