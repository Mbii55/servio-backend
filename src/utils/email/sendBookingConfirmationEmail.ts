// src/utils/email/sendBookingConfirmationEmail.ts
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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export async function sendBookingConfirmationEmail(params: {
  to: string;
  customerName: string;
  bookingNumber: string;
  serviceTitle: string;
  providerName: string;
  scheduledDate: string;
  scheduledTime: string;
  subtotal: number;
  paymentMethod: string;
  customerNotes?: string;
}) {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;

  const safeName = escapeHtml(params.customerName);
  const safeService = escapeHtml(params.serviceTitle);
  const safeProvider = escapeHtml(params.providerName);
  const safeNotes = params.customerNotes ? escapeHtml(params.customerNotes) : null;

  const formattedDate = formatDate(params.scheduledDate);
  const formattedTime = formatTime(params.scheduledTime);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `Booking Confirmed - ${params.bookingNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center">
            <div style="background:#fff;width:80px;height:80px;border-radius:40px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:48px">✅</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700">Booking Confirmed!</h1>
            <p style="color:#e0e7ff;margin:10px 0 0 0;font-size:16px">Your service has been booked</p>
          </div>

          <!-- Content -->
          <div style="background:#fff;padding:40px 30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
            <!-- Greeting -->
            <div style="text-align:center;margin-bottom:30px">
              <h2 style="color:#1f2937;font-size:22px;margin:0 0 10px 0">
                Thank you, ${safeName}!
              </h2>
              <p style="color:#6b7280;font-size:15px;margin:0">
                Your booking has been confirmed and sent to the service provider.
              </p>
            </div>

            <!-- Booking Number Badge -->
            <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);padding:20px;border-radius:10px;margin-bottom:30px;text-align:center">
              <p style="color:#6b7280;font-size:13px;margin:0 0 5px 0;text-transform:uppercase;letter-spacing:1px">Booking Reference</p>
              <h3 style="color:#2563eb;font-size:28px;margin:0;font-weight:700">${params.bookingNumber}</h3>
            </div>

            <!-- Booking Details -->
            <div style="background:#f9fafb;border-radius:10px;padding:25px;margin-bottom:30px">
              <h3 style="color:#1f2937;font-size:18px;margin:0 0 20px 0;border-bottom:2px solid #e5e7eb;padding-bottom:10px">
                📋 Booking Details
              </h3>
              
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;width:120px;vertical-align:top">
                    <strong>Service:</strong>
                  </td>
                  <td style="padding:12px 0;color:#1f2937;font-size:14px;font-weight:600">
                    ${safeService}
                  </td>
                </tr>
                <tr style="background:#f3f4f6">
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top">
                    <strong>Provider:</strong>
                  </td>
                  <td style="padding:12px 0;color:#1f2937;font-size:14px">
                    ${safeProvider}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top">
                    <strong>Date:</strong>
                  </td>
                  <td style="padding:12px 0;color:#1f2937;font-size:14px;font-weight:600">
                    ${formattedDate}
                  </td>
                </tr>
                <tr style="background:#f3f4f6">
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top">
                    <strong>Time:</strong>
                  </td>
                  <td style="padding:12px 0;color:#1f2937;font-size:14px;font-weight:600">
                    ${formattedTime}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top">
                    <strong>Total:</strong>
                  </td>
                  <td style="padding:12px 0;color:#10b981;font-size:18px;font-weight:700">
                    QAR ${params.subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr style="background:#f3f4f6">
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top">
                    <strong>Payment:</strong>
                  </td>
                  <td style="padding:12px 0;color:#1f2937;font-size:14px;text-transform:capitalize">
                    ${params.paymentMethod}
                  </td>
                </tr>
                ${safeNotes ? `
                <tr>
                  <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top">
                    <strong>Notes:</strong>
                  </td>
                  <td style="padding:12px 0;color:#1f2937;font-size:13px;line-height:1.6">
                    ${safeNotes}
                  </td>
                </tr>
                ` : ''}
              </table>
            </div>

            <!-- What Happens Next -->
            <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:20px;border-radius:8px;margin-bottom:30px">
              <h4 style="color:#92400e;font-size:16px;margin:0 0 12px 0">⏰ What Happens Next?</h4>
              <ol style="margin:0;padding-left:20px;color:#78350f;font-size:14px;line-height:1.8">
                <li>The service provider will review your booking</li>
                <li>You'll receive a notification when they accept</li>
                <li>The provider will contact you if needed</li>
                <li>Service will be provided at scheduled time</li>
              </ol>
            </div>

            <!-- Important Info -->
            <div style="background:#eff6ff;padding:20px;border-radius:10px;margin-bottom:30px">
              <h4 style="color:#1e40af;font-size:16px;margin:0 0 12px 0">💡 Important Information</h4>
              <ul style="margin:0;padding-left:20px;color:#1e3a8a;font-size:13px;line-height:1.8">
                <li>Make sure you're available at the scheduled time</li>
                <li>Keep your phone accessible for provider contact</li>
                <li>You can track your booking status in the app</li>
                <li>Payment will be collected after service completion</li>
              </ul>
            </div>

            <!-- Need Help -->
            <div style="background:#f9fafb;padding:20px;border-radius:8px;text-align:center">
              <p style="color:#6b7280;font-size:14px;margin:0 0 10px 0">
                Need to make changes to your booking?
              </p>
              <p style="margin:0">
                <a href="mailto:support@servio.com" style="color:#2563eb;text-decoration:none;font-weight:600">Contact Support</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
            <p style="margin:0 0 10px 0">You're receiving this email because you booked a service on Servio</p>
            <p style="margin:0">
              <a href="mailto:support@servio.com" style="color:#2563eb;text-decoration:none">Support</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] sendBookingConfirmationEmail error:", error);
      return { ok: false as const, error };
    }

    console.log(`✅ Booking confirmation email sent to ${params.to} (${data?.id})`);
    return { ok: true as const, id: data?.id };
  } catch (err: any) {
    console.error("[Resend] sendBookingConfirmationEmail exception:", err);
    return { ok: false as const, error: err };
  }
}