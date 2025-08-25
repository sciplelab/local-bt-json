import { Hono } from "hono";
import { cors } from "hono/cors";
import { databaseService } from "./database.js";
import { makeApiCall } from "./fanout.js";
import { handleCommand } from "./handlers/command-handler.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    credentials: true,
  })
);

app.post("/api/bt-json", async (c) => {
  try {
    const body = await c.req.json();
    console.log(body);

    const { command, parameters } = extractCommandAndParameters(body);

    const result = await databaseService.executeStoredProcedure(
      command,
      parameters
    );
    const recordset = result.recordset;

    return await handleCommand(c, command, body, recordset);
  } catch (error) {
    console.error("[Error]", error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  } finally {
    await databaseService.disconnect();
  }
});

function extractCommandAndParameters(body: Record<string, any>): {
  command: string;
  parameters: Record<string, any>;
} {
  const entries = Object.entries(body);
  const [, firstValue] = entries[0] || [];

  const command = firstValue as string;
  const parameters: Record<string, any> = {};

  for (let i = 1; i < entries.length; i++) {
    const [key, value] = entries[i];
    parameters[key] = value;
  }

  return { command, parameters };
}

app.use("*", async (c, next) => {
  await next();

  // Only run fanout for bt-json endpoint
  if (c.req.path === "/bt-json" && c.req.method === "POST") {
    const body = await c.req.json();
    const API_CONFIG = {
      production: "https://omni.sciplelabs.co",
      localhost: "http://localhost:3000",
    };

    Object.values(API_CONFIG).forEach((baseUrl) => {
      makeApiCall(baseUrl, body.command, body);
    });
  }
});

export default app;
