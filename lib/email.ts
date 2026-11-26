import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const ADMIN_EMAIL = "owner@example.com";

function getFrom(): string {
  return (
    process.env.RESEND_FROM_EMAIL ||
    "3D Print Site <onboarding@resend.dev>"
  );
}

function getStatusUrl(publicToken: string): string {
  const base =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return `/status/${publicToken}`;
  return `${base.replace(/\/$/, "")}/status/${publicToken}`;
}

export async function sendAdminNewRequestNotification(params: {
  requestId: string;
  requestSource: "upload" | "store";
  customerName: string;
  customerEmail: string;
  statusUrl: string;
  extra?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping admin notification");
    return { ok: false, error: "Email not configured" };
  }

  const { requestId, requestSource, customerName, customerEmail, statusUrl, extra } = params;
  const subject =
    requestSource === "store"
      ? `[3D Print] New store request from ${customerName}`
      : `[3D Print] New print request from ${customerName}`;

  const html = `
    <p>A new ${requestSource === "store" ? "store" : "print"} request was submitted.</p>
    <ul>
      <li><strong>Request ID:</strong> ${requestId}</li>
      <li><strong>Customer:</strong> ${customerName} &lt;${customerEmail}&gt;</li>
      <li><strong>Status:</strong> <a href="${statusUrl}">View request</a></li>
      ${extra ? `<li>${extra}</li>` : ""}
    </ul>
  `;

  const { error } = await resend.emails.send({
    from: getFrom(),
    to: [ADMIN_EMAIL],
    subject,
    html,
  });

  if (error) {
    console.error("[email] Admin notification failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendCustomerConfirmation(params: {
  to: string;
  customerName: string;
  requestId: string;
  statusUrl: string;
  isStoreRequest?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping customer confirmation");
    return { ok: false, error: "Email not configured" };
  }
  // Resend sandbox only delivers to the account owner. Skip customer email
  // unless a domain is verified (RESEND_FROM_EMAIL set) so we don't waste sends.
  if (!process.env.RESEND_FROM_EMAIL) {
    return { ok: false, error: "Customer email skipped (no verified domain)" };
  }

  const { to, customerName, requestId, statusUrl, isStoreRequest } = params;
  const subject = isStoreRequest
    ? "Your 3D print request was received"
    : "Your print request was received";

  const html = `
    <p>Hi ${customerName},</p>
    <p>We've received your ${isStoreRequest ? "store " : ""}print request.</p>
    <p><strong>Request ID:</strong> ${requestId}</p>
    <p>You can check the status of your request anytime using this link:</p>
    <p><a href="${statusUrl}">View my request status</a></p>
    <p>Bookmark or save the link so you can come back to it later.</p>
    <p>Add my Snapchat: your_handle. When you add me, send your Request ID so I can match you.</p>
    <p>— 3D Print Site</p>
  `;

  const { error } = await resend.emails.send({
    from: getFrom(),
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("[email] Customer confirmation failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Resend sandbox (onboarding@resend.dev) only delivers to the account owner.
 * To send to customers, verify a domain at resend.com/domains and set
 * RESEND_FROM_EMAIL to an address on that domain (e.g. notifications@yourdomain.com).
 */

export { getStatusUrl };
