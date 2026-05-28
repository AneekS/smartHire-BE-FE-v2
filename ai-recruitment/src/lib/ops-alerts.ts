import { Resend } from "resend";

export type OpsAlertSeverity = "info" | "warning" | "critical";

export interface OpsAlertInput {
  subject: string;
  body: string;
  severity?: OpsAlertSeverity;
}

export async function sendOpsAlert(input: OpsAlertInput): Promise<void> {
  const payload = {
    subject: input.subject,
    body: input.body,
    severity: input.severity ?? "info",
    timestamp: new Date().toISOString(),
  };

  console.log("[ops-alert]", JSON.stringify(payload));

  const slackUrl = process.env.OPS_SLACK_WEBHOOK_URL;
  if (slackUrl) {
    try {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*[${payload.severity.toUpperCase()}]* ${input.subject}\n${input.body}`,
        }),
      });
    } catch (e) {
      console.error("[ops-alert] Slack webhook failed:", e);
    }
  }

  const email = process.env.OPS_ALERT_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  if (email && resendKey) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.OPS_ALERT_FROM ?? "SmartHire Ops <ops@smarthire.ai>",
        to: email,
        subject: `[SmartHire ${payload.severity}] ${input.subject}`,
        text: input.body,
      });
    } catch (e) {
      console.error("[ops-alert] Email send failed:", e);
    }
  }
}
