import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asTextContent } from "#lib/mcp";
import type { ProductRuntime } from "#products/types";

export function registerGetAnalysisTool(server: McpServer, runtime: ProductRuntime<"tms">) {
  server.registerTool(
    "tms_get_analysis",
    {
      description:
        "Fetch a completed TM analysis. The response includes overall metadata plus an analyseLanguageParts array, with each language part containing its own jobs[] array — that is where the per-job match-rate breakdown (101%, 100%, 95-99%, 85-94%, 75-84%, 50-74%, no match, repetitions, with weighted word counts) lives, so per-language results (e.g. Hindi vs Tamil) can be inspected without a separate list call. Use after tms_create_analyses_async has been triggered and tms_get_async_request returns status = COMPLETED. (GET /api2/v3/analyses/{uid})",
      annotations: { title: "[TMS] Get Analysis", readOnlyHint: true },
      inputSchema: {
        analysis_uid: z
          .string()
          .min(1)
          .describe(
            "Analysis UID returned by the completed asyncRequest payload from tms_create_analyses_async.",
          ),
      },
    },
    async ({ analysis_uid }) => {
      const analysis = await runtime.client.get(`/v3/analyses/${encodeURIComponent(analysis_uid)}`);
      return asTextContent(analysis);
    },
  );
}
