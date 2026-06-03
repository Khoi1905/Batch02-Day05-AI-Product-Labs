import fs from "node:fs";
import path from "node:path";
import type { TriageApiResponse } from "../src/types";

const logDir = path.resolve("monitoring");
const logFile = path.join(logDir, "triage-events.jsonl");
const inMemoryEvents: TriageApiResponse[] = [];

export function recordTriageEvent(event: TriageApiResponse): void {
  inMemoryEvents.unshift(event);
  if (inMemoryEvents.length > 50) {
    inMemoryEvents.pop();
  }

  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    logFile,
    `${JSON.stringify({
      telemetry: event.telemetry,
      ticket: event.ticket,
      raw_model_output: event.raw_model_output
    })}\n`,
    "utf8"
  );
}

export function getRecentEvents(): TriageApiResponse[] {
  return inMemoryEvents;
}
