import type { Config, Context } from "@netlify/functions";
import { productionScan } from "./scan-background.js";

interface ScheduleDependencies { run?: () => Promise<unknown> }

export async function scheduleHandler(_request: Request, _context: Context, dependencies: ScheduleDependencies = {}): Promise<Response> {
  const outcome = await (dependencies.run ?? productionScan)() as { published?: unknown };
  return new Response(JSON.stringify({ accepted: true, published: outcome?.published === true }), {
    status: 202,
    headers: { "Content-Type": "application/json" }
  });
}

export default scheduleHandler;
export const config: Config = { schedule: "0 */6 * * *", background: true };
