import { sendLovableEmail, type EmailSendResponse } from "@lovable.dev/email-js";
import { render } from "@react-email/render";
import React from "react";
import { TEMPLATES } from "./registry";

interface SendOptions {
  templateData: Record<string, any>;
  idempotencyKey?: string;
}

export async function sendTemplateEmail(templateName: string, to: string, options: SendOptions): Promise<EmailSendResponse> {
  const template = TEMPLATES[templateName];
  if (!template) throw new Error(`Email template "${templateName}" not found`);

  const Component = template.component;
  const html = await render(<Component {...options.templateData} />);
  const subject = typeof template.subject === "function" ? template.subject(options.templateData) : template.subject;
  const from = process.env.FROM_EMAIL;
  if (!from) throw new Error("FROM_EMAIL is not configured. Set a verified sender email in your project secrets.");

  const text = `Ciao, hai ricevuto un ordine privato. Visualizzalo qui: ${options.templateData.orderUrl ?? ""}`;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const result = await sendLovableEmail(
    {
      to,
      from,
      subject,
      html,
      text,
      idempotency_key: options.idempotencyKey,
    },
    { apiKey },
  );

  return result;
}
