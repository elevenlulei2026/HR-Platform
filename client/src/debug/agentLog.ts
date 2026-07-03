// #region agent log
type AgentLogPayload = {
  sessionId: "5d0fbc";
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
};

export function agentLog(payload: Omit<AgentLogPayload, "sessionId" | "timestamp">) {
  const body: AgentLogPayload = {
    sessionId: "5d0fbc",
    timestamp: Date.now(),
    ...payload,
  };

  fetch("http://127.0.0.1:7252/ingest/cde6c704-9c54-45d5-bcfb-f0f4de4683bd", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5d0fbc" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
// #endregion agent log

