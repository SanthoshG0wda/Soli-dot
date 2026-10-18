export async function register() {
  // Backend services (boot, scheduler, SQLite, event bus) run in standalone soli-backend service.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[soli-web] Web frontend initialized. Backend connected at", process.env.BACKEND_URL || "http://localhost:4000");
  }
}
