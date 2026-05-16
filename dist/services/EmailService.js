"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const DEFAULT_FRONTEND_URL = "http://localhost:3000";
function parseBool(value) {
    return String(value).toLowerCase() === "true";
}
function firstNonEmpty(...values) {
    return values.find((value) => Boolean(value && value.trim().length > 0));
}
function createInviteUrl(token, email) {
    const frontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
    return `${frontendUrl.replace(/\/$/, "")}/?token=${token}&email=${encodeURIComponent(email)}`;
}
class EmailService {
    constructor() {
        this.from = firstNonEmpty(process.env.SMTP_FROM, process.env.MAIL_FROM) || "no-reply@taskflow.local";
    }
    getTransporter() {
        const host = firstNonEmpty(process.env.SMTP_HOST, process.env.MAIL_HOST);
        const user = firstNonEmpty(process.env.SMTP_USER, process.env.MAIL_USERNAME);
        const rawPass = firstNonEmpty(process.env.SMTP_PASS, process.env.MAIL_PASSWORD);
        const pass = host?.includes("gmail.com") ? rawPass?.replace(/\s+/g, "") : rawPass;
        if (!host || !user || !pass) {
            console.warn("SMTP is not configured. Missing one or more of SMTP_HOST/MAIL_HOST, SMTP_USER/MAIL_USERNAME, SMTP_PASS/MAIL_PASSWORD.");
            return null;
        }
        const secureRaw = firstNonEmpty(process.env.SMTP_SECURE, process.env.MAIL_SECURE);
        const portRaw = firstNonEmpty(process.env.SMTP_PORT, process.env.MAIL_PORT);
        const secure = secureRaw ? parseBool(secureRaw) : Number(portRaw || 587) === 465;
        const port = Number(portRaw || (secure ? 465 : 587));
        return nodemailer_1.default.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass
            }
        });
    }
    async sendInvitation(params) {
        const transporter = this.getTransporter();
        if (!transporter) {
            console.warn("Invitation email was skipped because SMTP is not configured.");
            return {
                sent: false,
                inviteUrl: createInviteUrl(params.token, params.email),
                error: "SMTP is not configured"
            };
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
        try {
            await transporter.sendMail({
                from: this.from,
                to: params.email,
                subject,
                text,
                html
            });
        }
        catch (error) {
            const message = error?.message || "Unknown SMTP error";
            console.error(`Failed to send invitation email: ${message}`);
            return { sent: false, inviteUrl, error: message };
        }
        return { sent: true, inviteUrl };
    }
    async sendOtp(params) {
        const transporter = this.getTransporter();
        if (!transporter) {
            console.warn("OTP email was skipped because SMTP is not configured.");
            return { sent: false };
        }
        try {
            await transporter.sendMail({
                from: this.from,
                to: params.email,
                subject: "Your password reset OTP",
                text: `Your password reset OTP is ${params.otp}. It expires in 10 minutes.`,
                html: `<p>Your password reset OTP is <strong>${params.otp}</strong>. It expires in 10 minutes.</p>`
            });
        }
        catch (error) {
            console.error(`Failed to send OTP email: ${error?.message || "Unknown SMTP error"}`);
            return { sent: false };
        }
        return { sent: true };
    }
}
exports.EmailService = EmailService;
