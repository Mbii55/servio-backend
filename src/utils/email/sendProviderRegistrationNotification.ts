// src/utils/sendProviderRegistrationNotification.ts
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

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Qatar',
  });
}

export async function sendProviderRegistrationNotification(params: {
  providerName: string;
  providerEmail: string;
  providerPhone?: string;
  businessName: string;
  businessDescription?: string;
  userId: string;
  businessProfileId: string;
}) {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
const adminEmails = process.env.ADMIN_EMAIL 
  ? process.env.ADMIN_EMAIL.split(',').map(e => e.trim())
  : ["admin@servio.com"];

  const safeName = escapeHtml(params.providerName);
  const safeBusinessName = escapeHtml(params.businessName);
  const safeEmail = escapeHtml(params.providerEmail);
  const safePhone = params.providerPhone ? escapeHtml(params.providerPhone) : "Not provided";
  const safeDescription = params.businessDescription 
    ? escapeHtml(params.businessDescription) 
    : "No description provided";

  const registrationTime = formatDateTime(new Date());

  // Admin panel verification URL
  const adminBaseUrl = process.env.ADMIN_PANEL_URL || "http://localhost:3001";
  const verificationUrl = `${adminBaseUrl}/admin/verifications`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: adminEmails,
      subject: `🔔 New Provider Registration - ${params.businessName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:30px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">New Provider Registration</h1>
            <p style="color:#e0e7ff;margin:10px 0 0 0;font-size:14px">Verification Required</p>
          </div>

          <!-- Content -->
          <div style="background:#fff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
            <!-- Alert Box -->
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;border-radius:8px;margin-bottom:25px">
              <p style="margin:0;color:#92400e;font-weight:600;font-size:14px">
                ⏰ A new service provider has registered and is pending verification.
              </p>
            </div>

            <!-- Business Info -->
            <div style="background:#f3f4f6;padding:20px;border-radius:10px;margin-bottom:20px">
              <h2 style="color:#1f2937;font-size:18px;margin:0 0 15px 0;border-bottom:2px solid #e5e7eb;padding-bottom:10px">
                🏢 Business Information
              </h2>
              
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-weight:600;width:140px">Business Name:</td>
                  <td style="padding:8px 0;color:#1f2937;font-weight:700">${safeBusinessName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-weight:600">Provider Name:</td>
                  <td style="padding:8px 0;color:#1f2937">${safeName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-weight:600">Email:</td>
                  <td style="padding:8px 0;color:#2563eb">
                    <a href="mailto:${params.providerEmail}" style="color:#2563eb;text-decoration:none">${safeEmail}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-weight:600">Phone:</td>
                  <td style="padding:8px 0;color:#1f2937">${safePhone}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-weight:600;vertical-align:top">Description:</td>
                  <td style="padding:8px 0;color:#1f2937;font-size:13px;line-height:1.5">${safeDescription}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-weight:600">Registered:</td>
                  <td style="padding:8px 0;color:#1f2937">${registrationTime}</td>
                </tr>
              </table>
            </div>

            <!-- Next Steps -->
            <div style="background:#eff6ff;padding:20px;border-radius:10px;margin-bottom:25px">
              <h3 style="color:#1e40af;font-size:16px;margin:0 0 12px 0">📋 Next Steps</h3>
              <ol style="margin:0;padding-left:20px;color:#1f2937;font-size:14px;line-height:1.8">
                <li>Review the provider's business information</li>
                <li>Verify submitted documents (Commercial Registration, Trade License)</li>
                <li>Check business legitimacy and compliance</li>
                <li>Approve or reject the registration with feedback</li>
              </ol>
            </div>

            <!-- Action Button -->
            <div style="text-align:center;margin:30px 0">
              <a href="${verificationUrl}" 
                 style="display:inline-block;padding:16px 40px;border-radius:10px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 6px rgba(37,99,235,0.3)">
                Review Verification Documents
              </a>
            </div>

            <!-- Quick Info -->
            <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-top:25px">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center">
                <strong>User ID:</strong> ${params.userId} | 
                <strong>Business Profile ID:</strong> ${params.businessProfileId}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
            <p style="margin:0 0 10px 0">This is an automated notification from Servio Admin System</p>
            <p style="margin:0">
              <a href="${adminBaseUrl}" style="color:#2563eb;text-decoration:none">Admin Panel</a> | 
              <a href="${verificationUrl}" style="color:#2563eb;text-decoration:none">Verifications</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] sendProviderRegistrationNotification error:", error);
      return { ok: false as const, error };
    }

    console.log(`✅ Admin notification sent for provider: ${params.businessName} (${data?.id})`);
    return { ok: true as const, id: data?.id };
  } catch (err: any) {
    console.error("[Resend] sendProviderRegistrationNotification exception:", err);
    return { ok: false as const, error: err };
  }
}