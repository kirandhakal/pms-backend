import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create reusable Nodemailer transporter.
 *
 * Supports any SMTP provider (Gmail, Brevo, Mailtrap, etc.).
 * Configure via .env:
 *   MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM
 */
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

/**
 * Generic mail sender.
 */
export async function sendMail(to: string, subject: string, html: string) {
    const info = await transporter.sendMail({
        from: process.env.MAIL_FROM || `"Kanban App" <noreply@kanban.local>`,
        to,
        subject,
        html,
    });

    console.log("✉️  Email sent:", info.messageId);
    return info;
}

/**
 * Send a styled invitation email.
 */
export async function sendInvitationEmail(
    recipientEmail: string,
    inviteUrl: string,
    role: string,
    expiresAt: Date
) {
    const expiryStr = expiresAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        <!-- Header -->
                        <tr>
                            <td style="background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899);padding:36px 40px;text-align:center;">
                                <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                                    🎉 You're Invited!
                                </h1>
                                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                                    Join our Kanban workspace
                                </p>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:36px 40px;">
                                <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                                    Hello! 👋
                                </p>
                                <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">
                                    You've been invited to join our project management workspace as a
                                    <strong style="color:#6366f1;">${role}</strong>. Click the button below
                                    to create your account and get started.
                                </p>

                                <!-- CTA Button -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding:8px 0 28px;">
                                            <a href="${inviteUrl}"
                                               target="_blank"
                                               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:10px;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
                                                Accept Invitation →
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Details Card -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                                    <tr>
                                        <td style="padding:20px 24px;">
                                            <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;">
                                                Invitation Details
                                            </p>
                                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                                <tr>
                                                    <td style="padding:4px 0;color:#64748b;font-size:14px;">Role:</td>
                                                    <td style="padding:4px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${role}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding:4px 0;color:#64748b;font-size:14px;">Expires:</td>
                                                    <td style="padding:4px 0;color:#1e293b;font-size:14px;font-weight:600;text-align:right;">${expiryStr}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:24px 0 0;color:#94a3b8;font-size:13px;line-height:1.5;">
                                    If you didn't expect this email, you can safely ignore it. This invitation link will expire on <strong>${expiryStr}</strong>.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
                                <p style="margin:0;color:#94a3b8;font-size:12px;">
                                    Sent from <strong>Kanban App</strong> · Project Management Made Simple
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    return sendMail(recipientEmail, "🎉 You're Invited to Join Our Workspace!", html);
}
