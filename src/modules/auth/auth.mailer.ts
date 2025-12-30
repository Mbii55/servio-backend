// src/lib/email/sendPasswordResetEmail.ts (or wherever you keep it)
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Prefer explicit env var. Fallback to Resend sandbox sender (works immediately).
const DEFAULT_FROM = "Servio <onboarding@resend.dev>";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name?: string;
  resetUrl: string;
}) {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;

  const safeName = params.name?.trim() ? escapeHtml(params.name.trim()) : "there";
  const safeUrl = params.resetUrl; // you generate this server-side, so it's trusted

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: "Reset your Servio password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Reset your password</h2>
          <p>Hi ${safeName},</p>
          <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
          <p>
            <a href="${safeUrl}"
               style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563EB;color:#fff;text-decoration:none;font-weight:700">
              Reset Password
            </a>
          </p>
          <p>If you didn’t request this, you can ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] sendPasswordResetEmail error:", error);
      return { ok: false as const, error };
    }

    return { ok: true as const, id: data?.id };
  } catch (err: any) {
    console.error("[Resend] sendPasswordResetEmail exception:", err);
    return { ok: false as const, error: err };
  }
}
