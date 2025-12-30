// src/utils/email/sendBookingStatusUpdateEmail.ts
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

type BookingStatus = 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<BookingStatus, {
  emoji: string;
  color: string;
  gradient: string;
  title: string;
  message: string;
  nextSteps: string[];
}> = {
  accepted: {
    emoji: '✅',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#10B981,#059669)',
    title: 'Booking Accepted',
    message: 'Great news! Your service provider has accepted your booking request.',
    nextSteps: [
      'The provider will contact you if any details need confirmation',
      'Make sure you\'re available at the scheduled time',
      'Service will be provided as scheduled',
      'You\'ll receive updates as the booking progresses',
    ],
  },
  rejected: {
    emoji: '❌',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg,#EF4444,#DC2626)',
    title: 'Booking Declined',
    message: 'Unfortunately, the service provider is unable to accept your booking at this time.',
    nextSteps: [
      'Browse other available service providers',
      'Try booking a different time slot',
      'Contact support if you need assistance',
      'Your payment has not been processed',
    ],
  },
  in_progress: {
    emoji: '🔧',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
    title: 'Service in Progress',
    message: 'Your service provider has started working on your booking.',
    nextSteps: [
      'The provider is currently providing the service',
      'They may contact you during the service if needed',
      'You\'ll be notified when the service is completed',
      'Please be available for any questions',
    ],
  },
  completed: {
    emoji: '✨',
    color: '#10b981',
    gradient: 'linear-gradient(135deg,#10B981,#059669)',
    title: 'Service Completed',
    message: 'Your service has been successfully completed!',
    nextSteps: [
      'Payment has been processed',
      'Please rate your experience in the app',
      'Share feedback to help improve our services',
      'Book again if you were satisfied with the service',
    ],
  },
  cancelled: {
    emoji: '🚫',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg,#F59E0B,#D97706)',
    title: 'Booking Cancelled',
    message: 'This booking has been cancelled.',
    nextSteps: [
      'No payment has been processed',
      'You can book the same service again',
      'Contact support if you have questions',
      'Browse other available services',
    ],
  },
};

export async function sendBookingStatusUpdateEmail(params: {
  to: string;
  customerName: string;
  bookingNumber: string;
  serviceTitle: string;
  providerName: string;
  status: BookingStatus;
  rejectionReason?: string;
  cancellationReason?: string;
}) {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
  const config = STATUS_CONFIG[params.status];

  const safeName = escapeHtml(params.customerName);
  const safeService = escapeHtml(params.serviceTitle);
  const safeProvider = escapeHtml(params.providerName);
  const safeReason = params.rejectionReason 
    ? escapeHtml(params.rejectionReason) 
    : params.cancellationReason 
    ? escapeHtml(params.cancellationReason) 
    : null;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: `${config.title} - ${params.bookingNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
          <!-- Header -->
          <div style="background:${config.gradient};padding:40px 30px;border-radius:12px 12px 0 0;text-align:center">
            <div style="background:#fff;width:80px;height:80px;border-radius:40px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:48px">${config.emoji}</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700">${config.title}</h1>
            <p style="color:rgba(255,255,255,0.9);margin:10px 0 0 0;font-size:16px">Booking #${params.bookingNumber}</p>
          </div>

          <!-- Content -->
          <div style="background:#fff;padding:40px 30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
            <!-- Greeting -->
            <div style="margin-bottom:30px">
              <h2 style="color:#1f2937;font-size:20px;margin:0 0 15px 0">
                Hi ${safeName},
              </h2>
              <p style="color:#6b7280;font-size:15px;margin:0;line-height:1.6">
                ${config.message}
              </p>
            </div>

            <!-- Booking Info -->
            <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:25px">
              <h3 style="color:#1f2937;font-size:16px;margin:0 0 15px 0">📋 Booking Information</h3>
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px">Service:</td>
                  <td style="padding:8px 0;color:#1f2937;font-size:14px;font-weight:600;text-align:right">${safeService}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px">Provider:</td>
                  <td style="padding:8px 0;color:#1f2937;font-size:14px;text-align:right">${safeProvider}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:14px">Booking #:</td>
                  <td style="padding:8px 0;color:${config.color};font-size:14px;font-weight:700;text-align:right">${params.bookingNumber}</td>
                </tr>
              </table>
            </div>

            ${safeReason ? `
            <!-- Reason -->
            <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:20px;border-radius:8px;margin-bottom:25px">
              <h4 style="color:#991b1b;font-size:14px;margin:0 0 8px 0">Reason:</h4>
              <p style="color:#7f1d1d;font-size:14px;margin:0;line-height:1.6">${safeReason}</p>
            </div>
            ` : ''}

            <!-- Next Steps -->
            <div style="background:rgba(${config.color === '#10b981' ? '16,185,129' : config.color === '#ef4444' ? '239,68,68' : config.color === '#8b5cf6' ? '139,92,246' : '245,158,11'},0.1);padding:20px;border-radius:10px;margin-bottom:25px">
              <h4 style="color:${config.color};font-size:16px;margin:0 0 12px 0">What's Next?</h4>
              <ul style="margin:0;padding-left:20px;color:#1f2937;font-size:14px;line-height:1.8">
                ${config.nextSteps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>

            ${params.status === 'completed' ? `
            <!-- Rate Service -->
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:25px;border-radius:10px;margin-bottom:20px;text-align:center">
              <h4 style="color:#92400e;font-size:18px;margin:0 0 10px 0">⭐ How was your experience?</h4>
              <p style="color:#78350f;font-size:14px;margin:0 0 15px 0">
                Help others by sharing your feedback
              </p>
              <p style="margin:0;color:#6b7280;font-size:12px">
                Open the Servio app to rate this service
              </p>
            </div>
            ` : ''}

            <!-- Support -->
            <div style="background:#f9fafb;padding:20px;border-radius:8px;text-align:center">
              <p style="color:#6b7280;font-size:14px;margin:0 0 10px 0">
                Questions about your booking?
              </p>
              <p style="margin:0">
                <a href="mailto:support@servio.com" style="color:${config.color};text-decoration:none;font-weight:600">Contact Support</a>
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
            <p style="margin:0 0 10px 0">You're receiving this email about your Servio booking</p>
            <p style="margin:0">
              <a href="mailto:support@servio.com" style="color:#9ca3af;text-decoration:none">Support</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] sendBookingStatusUpdateEmail error:", error);
      return { ok: false as const, error };
    }

    console.log(`✅ Booking status update email sent to ${params.to} (${data?.id})`);
    return { ok: true as const, id: data?.id };
  } catch (err: any) {
    console.error("[Resend] sendBookingStatusUpdateEmail exception:", err);
    return { ok: false as const, error: err };
  }
}