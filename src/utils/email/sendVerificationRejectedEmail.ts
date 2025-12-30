// src/utils/email/sendVerificationRejectedEmail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const DEFAULT_FROM = "Servio <onboarding@resend.dev>";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendVerificationRejectedEmail(params: {
  to: string;
  providerName: string;
  businessName: string;
  rejectionReason: string;
}) {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
  const partnerPortalUrl = process.env.PARTNER_WEB_URL || "http://localhost:3000";

  const safeName = escapeHtml(params.providerName);
  const safeBusinessName = escapeHtml(params.businessName);
  const safeReason = escapeHtml(params.rejectionReason);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Action Required: Verification Issue for ${params.businessName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center">
            <div style="background:#fff;width:80px;height:80px;border-radius:40px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:48px">📋</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700">Verification Needs Attention</h1>
            <p style="color:#fecaca;margin:10px 0 0 0;font-size:16px">Additional information required</p>
          </div>

          <!-- Content -->
          <div style="background:#fff;padding:40px 30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
            <!-- Message -->
            <div style="text-align:center;margin-bottom:30px">
              <h2 style="color:#1f2937;font-size:22px;margin:0 0 15px 0">
                Hi ${safeName},
              </h2>
              <p style="color:#6b7280;font-size:15px;margin:0;line-height:1.6">
                We've reviewed your verification documents for <strong style="color:#ef4444">${safeBusinessName}</strong> and unfortunately, we need you to make some updates before we can approve your account.
              </p>
            </div>

            <!-- Reason Box -->
            <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:20px;border-radius:8px;margin-bottom:30px">
              <h3 style="color:#991b1b;font-size:18px;margin:0 0 12px 0">❌ Reason for Rejection</h3>
              <p style="color:#7f1d1d;font-size:15px;margin:0;line-height:1.7;font-weight:500">
                ${safeReason}
              </p>
            </div>

            <!-- What You Need to Do -->
            <div style="background:#eff6ff;padding:20px;border-radius:10px;margin-bottom:30px">
              <h3 style="color:#1e40af;font-size:18px;margin:0 0 15px 0">📝 What You Need to Do</h3>
              <ol style="margin:0;padding-left:20px;color:#1f2937;font-size:14px;line-height:1.8">
                <li><strong>Review the reason above</strong> carefully</li>
                <li><strong>Prepare updated documents</strong> that address the issue</li>
                <li><strong>Re-upload your documents</strong> through the Partner Portal</li>
                <li><strong>Submit for review</strong> - we'll review within 24-48 hours</li>
              </ol>
            </div>

            <!-- Document Requirements -->}
            <div style="background:#f0fdf4;padding:20px;border-radius:10px;margin-bottom:30px">
              <h3 style="color:#065f46;font-size:16px;margin:0 0 12px 0">✅ Required Documents</h3>
              <ul style="margin:0;padding-left:20px;color:#047857;font-size:13px;line-height:1.8">
                <li><strong>Commercial Registration:</strong> Valid and clearly legible</li>
                <li><strong>Trade License:</strong> Current and matches your business name</li>
                <li><strong>Document Quality:</strong> High-resolution scans or photos</li>
                <li><strong>Information Match:</strong> Details must match your profile</li>
              </ul>
            </div>

            <!-- Action Button -->}
            <div style="text-align:center;margin:35px 0">
              <a href="${partnerPortalUrl}/dashboard/business-profile" 
                 style="display:inline-block;padding:16px 40px;border-radius:10px;background:linear-gradient(135deg,#EF4444,#DC2626);color:#fff;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 6px rgba(239,68,68,0.3)">
                Update Documents Now
              </a>
            </div>

            <!-- Help Section -->}
            <div style="background:#fef3c7;padding:20px;border-radius:10px;margin-bottom:20px">
              <h4 style="color:#92400e;font-size:16px;margin:0 0 10px 0">💡 Common Issues</h4>
              <ul style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:1.7">
                <li>Blurry or unclear document images</li>
                <li>Expired registration or license</li>
                <li>Business name mismatch between documents and profile</li>
                <li>Missing required pages or information</li>
              </ul>
            </div>

            <!-- Support Info -->}
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-top:30px">
              <h4 style="color:#1f2937;font-size:14px;margin:0 0 10px 0">Need Help?</h4>
              <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6">
                If you're unsure about what's needed or have questions about the rejection reason, please don't hesitate to contact our support team:
              </p>
              <p style="margin:10px 0 0 0">
                <a href="mailto:support@servio.com" style="color:#ef4444;text-decoration:none;font-weight:600">support@servio.com</a>
              </p>
            </div>
          </div>

          <!-- Footer -->}
          <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
            <p style="margin:0 0 10px 0">You're receiving this email about your Servio business verification</p>
            <p style="margin:0">
              <a href="${partnerPortalUrl}" style="color:#ef4444;text-decoration:none">Partner Portal</a> | 
              <a href="mailto:support@servio.com" style="color:#ef4444;text-decoration:none">Support</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] sendVerificationRejectedEmail error:", error);
      return { ok: false as const, error };
    }

    console.log(`✅ Verification rejected email sent to ${params.to} (${data?.id})`);
    return { ok: true as const, id: data?.id };
  } catch (err: any) {
    console.error("[Resend] sendVerificationRejectedEmail exception:", err);
    return { ok: false as const, error: err };
  }
}