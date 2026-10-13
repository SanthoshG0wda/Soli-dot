export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { boot } = await import("./server/boot");
      boot();
    } catch (err) {
      console.warn("[instrumentation] Boot sequence encountered non-fatal error:", err);
    }
  }
}
