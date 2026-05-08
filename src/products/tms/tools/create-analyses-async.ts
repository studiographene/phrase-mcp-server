import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asTextContent } from "#lib/mcp";
import type { ProductRuntime } from "#products/types";

const ANALYSE_TYPES = [
  "PreAnalyse",
  "PostAnalyse",
  "Compare",
  "PreAnalyseTarget",
  "PostAnalyseTarget",
  "PreAnalyseSingleFolder",
] as const;

const jobReferenceSchema = z
  .object({
    uid: z.string().min(1).describe("TMS job UID."),
  })
  .passthrough();

export function registerCreateAnalysesAsyncTool(server: McpServer, runtime: ProductRuntime<"tms">) {
  server.registerTool(
    "tms_create_analyses_async",
    {
      description:
        "Trigger asynchronous TM analysis for one or more TMS job parts. Returns an AsyncAnalyseListResponseV2 object whose asyncRequests array contains one descriptor per submitted analysis. The match-rate breakdown (101%, 100%, 95-99%, 85-94%, 75-84%, 50-74%, no match, repetitions, with weighted word counts) is NOT immediately available. Next: poll tms_get_async_request with each asyncRequests[*].id until status = COMPLETED, then call tms_get_analysis with the analysis UID found in the completed async request payload — the v3 GET response includes per-language and per-job breakdowns under analyseLanguageParts[*].jobs. (POST /api2/v2/analyses)",
      annotations: { title: "[TMS] Create Analyses (Async)", destructiveHint: true },
      inputSchema: {
        jobs: z
          .array(jobReferenceSchema)
          .min(1)
          .max(100)
          .describe("Job references to analyse. Each item requires a uid; min 1, max 100."),
        type: z
          .enum(ANALYSE_TYPES)
          .optional()
          .describe(
            `Analysis type. One of: ${ANALYSE_TYPES.join(", ")}. Defaults to PreAnalyse when omitted.`,
          ),
        name: z
          .string()
          .min(1)
          .optional()
          .describe("Optional human-readable name for the analysis."),
        provider: z
          .record(z.unknown())
          .optional()
          .describe(
            'Optional provider reference (e.g. {"uid": "<linguistOrVendorUid>", "type": "LINGUIST"}).',
          ),
        netRateScheme: z
          .record(z.unknown())
          .optional()
          .describe('Optional net-rate scheme reference (e.g. {"uid": "<schemeUid>"}).'),
        extras: z
          .record(z.unknown())
          .optional()
          .describe(
            "Optional passthrough merged into the analyses request body. Use this for any field accepted by the TMS API not exposed explicitly above (e.g. useProjectAnalysisSettings, includeTransMemory, includeNonTranslatables, separateFuzzyRepetitions, compareWorkflowLevel, jobFilter, callbackUrl).",
          ),
      },
    },
    async ({ jobs, type, name, provider, netRateScheme, extras }) => {
      const body: Record<string, unknown> = {
        ...extras,
        jobs,
        type: type ?? "PreAnalyse",
      };
      if (name !== undefined) body.name = name;
      if (provider !== undefined) body.provider = provider;
      if (netRateScheme !== undefined) body.netRateScheme = netRateScheme;

      const created = await runtime.client.postJson("/v2/analyses", body);
      return asTextContent(created);
    },
  );
}
