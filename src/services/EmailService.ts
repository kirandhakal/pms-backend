import nodemailer from "nodemailer";

const DEFAULT_FRONTEND_URL = "http://localhost:3000";

function parseBool(value?: string): boolean {
    return String(value).toLowerCase() === "true";
}

function createInviteUrl(token: string, email: string) {
    const frontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
    return `${frontendUrl.replace(/\/$/, "")}/?token=${token}&email=${encodeURIComponent(email)}`;
}

export class EmailService {
    private readonly from = process.env.SMTP_FROM || "no-reply@taskflow.local";

    private getTransporter() {
        const host = process.env.SMTP_HOST;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!host || !user || !pass) {
            return null;
        }

        const secure = parseBool(process.env.SMTP_SECURE);
        const port = Number(process.env.SMTP_PORT || (secure ? 465 : 587));

        return nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass
            }
        });
    }

    async sendInvitation(params: { email: string; token: string; organizationName: string; inviterName: string; role: string }) {
        const transporter = this.getTransporter();
        if (!transporter) {
            console.warn("SMTP is not configured. Invitation email was not sent.");
            return { sent: false, inviteUrl: createInviteUrl(params.token, params.email) };
        }

        const inviteUrl = createInviteUrl(params.token, params.email);
        const subject = `Invitation to join ${params.organizationName}`;
        const text = [
            `Hi,`,
            `${params.inviterName} invited you to join ${params.organizationName} as ${params.role}.`,
            `Use this link to continue: ${inviteUrl}`,
            `This invitation expires in 48 hours.`
        ].join("\n");

        const html = `
            <p>Hi,</p>
            <p><strong>${params.inviterName}</strong> invited you to join <strong>${params.organizationName}</strong> as <strong>${params.role}</strong>.</p>
            <p><a href="${inviteUrl}">Accept invitation</a></p>
            <p>This invitation expires in 48 hours.</p>
        `;

        await transporter.sendMail({
            from: this.from,
            to: params.email,
            subject,
            text,
            html
        });

        return { sent: true, inviteUrl };
    }

    async sendOtp(params: { email: string; otp: string }) {
        const transporter = this.getTransporter();
        if (!transporter) {
            console.warn("SMTP is not configured. OTP email was not sent.");
            return { sent: false };
        }

        await transporter.sendMail({
            from: this.from,
            to: params.email,
            subject: "Your password reset OTP",
            text: `Your password reset OTP is ${params.otp}. It expires in 10 minutes.`,
            html: `<p>Your password reset OTP is <strong>${params.otp}</strong>. It expires in 10 minutes.</p>`
        });

        return { sent: true };
    }
}
