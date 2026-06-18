import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BinaryResponse } from "#lib/http";
import { asTextContent } from "#lib/mcp";
import type { ProductRuntime } from "#products/types";
import { tryDecodeFilename } from "#products/tms/tools/content-disposition";

export function registerDownloadOriginalFileTool(
  server: McpServer,
  runtime: ProductRuntime<"tms">,
) {
  server.registerTool(
    "tms_download_original_file",
    {
      description:
        "Download the original (source) file that was uploaded for a TMS job. Returns file content as base64 (bytes_base64) plus content_type and file_name. Optionally saves the decoded file to disk via output_path. (GET /api2/v1/projects/{projectUid}/jobs/{jobUid}/original)",
      annotations: { title: "[TMS] Download Original File", readOnlyHint: true },
      inputSchema: {
        project_uid: z.string().min(1).describe("TMS project UID."),
        job_uid: z.string().min(1).describe("TMS job UID."),
        output_path: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Optional filesystem path to save the decoded file. If set, bytes_base64 is still returned.",
          ),
      },
    },
    async ({ project_uid, job_uid, output_path }) => {
      const client = runtime.client;
      const path = `/v1/projects/${encodeURIComponent(project_uid)}/jobs/${encodeURIComponent(job_uid)}/original`;

      const file: BinaryResponse = await client.getBinary(path);

      let saved_to: string | null = null;
      if (output_path) {
        const absoluteOutputPath = resolve(output_path);
        await mkdir(dirname(absoluteOutputPath), { recursive: true });
        await writeFile(absoluteOutputPath, Buffer.from(file.bytesBase64, "base64"));
        saved_to = absoluteOutputPath;
      }

      return asTextContent({
        content_type: file.contentType,
        content_disposition: file.contentDisposition,
        file_name: tryDecodeFilename(file.contentDisposition),
        size_bytes: file.sizeBytes,
        bytes_base64: file.bytesBase64,
        saved_to,
      });
    },
  );
}
