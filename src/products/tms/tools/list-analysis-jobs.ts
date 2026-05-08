import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { asTextContent } from "#lib/mcp";
import type { ProductRuntime } from "#products/types";
import { paginationControlsSchema, querySchema } from "#products/tms/tools/query";

export function registerListAnalysisJobsTool(server: McpServer, runtime: ProductRuntime<"tms">) {
  server.registerTool(
    "tms_list_analysis_jobs",
    {
      description:
        "List per-job results within a completed TM analysis so per-language match-rate bands can be inspected separately (e.g. Hindi vs Tamil vs French rather than just the aggregate). Use after tms_create_analyses_async has been triggered and tms_get_async_request returns status = COMPLETED. For aggregate totals across all jobs in the analysis, use tms_get_analysis. (GET /api2/v2/analyses/{analysisUid}/jobs)",
      annotations: { title: "[TMS] List Analysis Jobs", readOnlyHint: true },
      inputSchema: {
        analysis_uid: z
          .string()
          .min(1)
          .describe(
            "Analysis UID returned by the completed asyncRequest payload from tms_create_analyses_async.",
          ),
        query: querySchema.describe(
          "Raw query parameters passed through to the TMS endpoint. Supports pageNumber (0-based) and pageSize.",
        ),
        ...paginationControlsSchema,
      },
    },
    async ({ analysis_uid, query, paginate, page_size, max_pages, max_items }) => {
      const client = runtime.client;
      const path = `/v2/analyses/${encodeURIComponent(analysis_uid)}/jobs`;
      if (!paginate) {
        const jobs = await client.get(path, query);
        return asTextContent(jobs);
      }

      const jobs = await client.paginateGet(path, {
        query,
        pageSize: page_size,
        maxPages: max_pages,
        maxItems: max_items,
      });
      return asTextContent(jobs);
    },
  );
}
