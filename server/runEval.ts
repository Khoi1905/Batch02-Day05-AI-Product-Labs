import { evalCases } from "../src/data/evalCases";
import { getOrderById } from "../src/data/mockOrders";
import { triageComplaint } from "../src/logic/triage";
import type { EvalResult } from "../src/types";
import { pathToFileURL } from "node:url";

export function runRuleBasedEval(): EvalResult[] {
  return evalCases.map((testCase) => {
    const actualTicket = triageComplaint(testCase.complaint, getOrderById(testCase.orderId));
    const actual = {
      issue_type: actualTicket.issue_type,
      route_to: actualTicket.route_to,
      confidence: actualTicket.confidence
    };
    const notes: string[] = [];
    if (actual.issue_type !== testCase.expected.issue_type) notes.push("issue_type mismatch");
    if (actual.route_to !== testCase.expected.route_to) notes.push("route_to mismatch");
    if (actual.confidence !== testCase.expected.confidence) notes.push("confidence mismatch");
    return {
      id: testCase.id,
      name: testCase.name,
      passed: notes.length === 0,
      expected: testCase.expected,
      actual,
      notes
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const results = runRuleBasedEval();
  const passed = results.filter((result) => result.passed).length;
  console.log(JSON.stringify({ passed, total: results.length, results }, null, 2));
}
