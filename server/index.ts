import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getOrderById } from "../src/data/mockOrders";
import { triageWithOpenRouter } from "./openRouter";
import { getRecentEvents, recordTriageEvent } from "./monitoring";
import { runRuleBasedEval } from "./runEval";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "grabfood-complaint-router-api" });
});

app.post("/api/triage", async (request, response) => {
  try {
    const complaintText = String(request.body?.complaintText ?? "").trim();
    const orderData = request.body?.orderData;

    if (!complaintText) {
      response.status(400).json({ error: "complaintText is required" });
      return;
    }

    if (!orderData?.order_id) {
      response.status(400).json({ error: "orderData is required" });
      return;
    }

    const result = await triageWithOpenRouter(complaintText, orderData);
    recordTriageEvent(result);
    response.json(result);
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

app.get("/api/monitoring", (_request, response) => {
  response.json({ events: getRecentEvents() });
});

app.post("/api/evals/run", (_request, response) => {
  const results = runRuleBasedEval();
  response.json({
    prompt_version: "grabfood-complaint-router-v1.0.0",
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    results
  });
});

app.get("/api/orders/:orderId", (request, response) => {
  try {
    response.json(getOrderById(request.params.orderId));
  } catch (error) {
    response.status(404).json({ error: error instanceof Error ? error.message : "Order not found" });
  }
});

app.listen(port, () => {
  console.log(`GrabFood complaint router API running on http://localhost:${port}`);
});
