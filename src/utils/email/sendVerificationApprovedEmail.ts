// src/utils/email/sendVerificationApprovedEmail.ts
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

export async function sendVerificationApprovedEmail(params: {
  to: string;
  providerName: string;
  businessName: string;
}) {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
  const partnerPortalUrl = process.env.PARTNER_WEB_URL || "http://localhost:3000";

  const safeName = escapeHtml(params.providerName);
  const safeBusinessName = escapeHtml(params.businessName);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `🎉 Congratulations! ${params.businessName} is Now Verified`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#10B981,#059669);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center">
            <div style="background:#fff;width:80px;height:80px;border-radius:40px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:48px">🎉</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700">Verification Approved!</h1>
            <p style="color:#d1fae5;margin:10px 0 0 0;font-size:16px">Your business is now live on Servio</p>
          </div>

          <!-- Content -->
          <div style="background:#fff;padding:40px 30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
            <!-- Success Message -->
            <div style="text-align:center;margin-bottom:30px">
              <h2 style="color:#1f2937;font-size:22px;margin:0 0 15px 0">
                Welcome to Servio, ${safeName}!
              </h2>
              <p style="color:#6b7280;font-size:15px;margin:0;line-height:1.6">
                Great news! Your business <strong style="color:#10b981">${safeBusinessName}</strong> has been successfully verified and is now live on our platform.
              </p>
            </div>

            <!-- What This Means -->
            <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:20px;border-radius:8px;margin-bottom:30px">
              <h3 style="color:#065f46;font-size:18px;margin:0 0 12px 0">✅ What This Means</h3>
              <ul style="margin:0;padding-left:20px;color:#047857;font-size:14px;line-height:1.8">
                <li>Your business profile is now visible to customers</li>
                <li>You can start receiving booking requests</li>
                <li>Customers can review and book your services</li>
                <li>You have full access to the Partner Portal</li>
              </ul>
            </div>

            <!-- Next Steps -->
            <div style="background:#eff6ff;padding:20px;border-radius:10px;margin-bottom:30px">
              <h3 style="color:#1e40af;font-size:18px;margin:0 0 15px 0">🚀 Next Steps</h3>
              <ol style="margin:0;padding-left:20px;color:#1f2937;font-size:14px;line-height:1.8">
                <li><strong>Add Your Services:</strong> List the services you offer with photos and pricing</li>
                <li><strong>Set Your Availability:</strong> Configure your working hours and schedule</li>
                <li><strong>Complete Your Profile:</strong> Add business description and contact details</li>
                <li><strong>Start Accepting Bookings:</strong> Monitor and respond to customer requests</li>
              </ol>
            </div>

            <!-- Quick Tips -->
            <div style="background:#fef3c7;padding:20px;border-radius:10px;margin-bottom:30px">
              <h3 style="color:#92400e;font-size:16px;margin:0 0 12px 0">💡 Quick Tips for Success</h3>
              <ul style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:1.8">
                <li>Upload high-quality photos of your work</li>
                <li>Respond to booking requests within 24 hours</li>
                <li>Keep your availability calendar up to date</li>
                <li>Provide excellent service to get 5-star reviews</li>
              </ul>
            </div>

            <!-- Action Button -->
            <div style="text-align:center;margin:35px 0">
              <a href="${partnerPortalUrl}/dashboard" 
                 style="display:inline-block;padding:16px 40px;border-radius:10px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 6px rgba(16,185,129,0.3)">
                Access Partner Portal
              </a>
            </div>

            <!-- Support Info -->
            <div style="background:#f9fafb;padding:20px;border-radius:8px;margin-top:30px">
              <h4 style="color:#1f2937;font-size:14px;margin:0 0 10px 0">Need Help?</h4>
              <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6">
                If you have any questions or need assistance getting started, our support team is here to help:
              </p>
              <p style="margin:10px 0 0 0">
                <a href="mailto:support@servio.com" style="color:#10b981;text-decoration:none;font-weight:600">support@servio.com</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
            <p style="margin:0 0 10px 0">You're receiving this email because your business was verified on Servio</p>
            <p style="margin:0">
              <a href="${partnerPortalUrl}" style="color:#10b981;text-decoration:none">Partner Portal</a> | 
              <a href="mailto:support@servio.com" style="color:#10b981;text-decoration:none">Support</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] sendVerificationApprovedEmail error:", error);
      return { ok: false as const, error };
    }

    console.log(`✅ Verification approved email sent to ${params.to} (${data?.id})`);
    return { ok: true as const, id: data?.id };
  } catch (err: any) {
    console.error("[Resend] sendVerificationApprovedEmail exception:", err);
    return { ok: false as const, error: err };
  }
}