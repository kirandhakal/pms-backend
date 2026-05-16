"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const Session_1 = require("../entities/Session");
const Invitation_1 = require("../entities/Invitation");
const auth_1 = require("../utils/auth");
const typeorm_1 = require("typeorm");
const ActivityLog_1 = require("../entities/ActivityLog");
const ActivityLogService_1 = require("./ActivityLogService");
const access_1 = require("../constants/access");
const PermissionService_1 = require("./PermissionService");
const PasswordResetOtp_1 = require("../entities/PasswordResetOtp");
const EmailService_1 = require("./EmailService");
class AuthService {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
        this.otpRepo = data_source_1.AppDataSource.getRepository(PasswordResetOtp_1.PasswordResetOtp);
        this.activityLogService = new ActivityLogService_1.ActivityLogService();
        this.permissionService = new PermissionService_1.PermissionService();
        this.emailService = new EmailService_1.EmailService();
    }
    async registerIndividual(data) {
        const { email, password, name } = data;
        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            throw new Error("Email already registered");
        }
        const hashedPassword = await (0, auth_1.hashPassword)(password);
        const user = this.userRepo.create({
            email,
            name,
            password: hashedPassword,
            role: User_1.UserRole.MEMBER
        });
        return this.userRepo.save(user);
    }
    async registerWithInvite(data) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const { email, password, name, token } = data;
            const existing = await manager.findOne(User_1.User, { where: { email } });
            if (existing) {
                throw new Error("Email already registered");
            }
            const invitation = await manager.findOne(Invitation_1.Invitation, {
                where: { email, token, isUsed: false, expiresAt: (0, typeorm_1.MoreThan)(new Date()) },
                relations: ["team"]
            });
            if (!invitation) {
                throw new Error("Invalid or expired invitation");
            }
            const hashedPassword = await (0, auth_1.hashPassword)(password);
            const user = manager.create(User_1.User, {
                email,
                name,
                password: hashedPassword,
                role: (0, access_1.normalizeRole)(invitation.role),
                team: invitation.team
            });
            const savedUser = await manager.save(user);
            invitation.isUsed = true;
            await manager.save(invitation);
            if (invitation.team?.id) {
                await this.activityLogService.log({
                    action: ActivityLog_1.ActivityAction.MEMBER_JOINED,
                    actorId: savedUser.id,
                    targetUserId: savedUser.id,
                    teamId: invitation.team.id,
                    details: `${savedUser.email} joined via invite`
                });
            }
            return savedUser;
        });
    }
    async login(email, password) {
        const user = await this.userRepo.findOne({
            where: { email },
            select: ["id", "password", "role", "name"]
        });
        if (!user || !(await (0, auth_1.comparePassword)(password, user.password))) {
            throw new Error("Invalid credentials");
        }
        const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
        const session = this.sessionRepo.create({
            user,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        });
        await this.sessionRepo.save(session);
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                role: (0, access_1.normalizeRole)(user.role)
            }
        };
    }
    async logout(token) {
        const session = await this.sessionRepo.findOne({ where: { token } });
        if (session) {
            session.isActive = false;
            await this.sessionRepo.save(session);
        }
    }
    async getCurrentUser(userId) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ["team", "team.createdBy"]
        });
        if (!user) {
            throw new Error("User not found");
        }
        const normalizedRole = (0, access_1.normalizeRole)(user.role);
        const effectivePermissions = await this.permissionService.getEffectivePermissions(user);
        const permissionKeys = Array.from(effectivePermissions);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
            legacyRole: user.role,
            role: {
                key: normalizedRole,
                level: this.permissionService.getRoleLevel(normalizedRole),
                permissions: this.permissionService.toFrontendPermissions(permissionKeys)
            },
            permissionKeys,
            organizationId: user.team?.id ?? null,
            team: user.team ? { id: user.team.id, name: user.team.name, createdById: user.team.createdBy?.id ?? null } : null
        };
    }
    // SuperAdmin initial setup (Internal or via first user logic)
    async createSuperAdmin(data) {
        const hashedPassword = await (0, auth_1.hashPassword)(data.password);
        const user = this.userRepo.create({ ...data, password: hashedPassword, role: User_1.UserRole.SUPER_ADMIN });
        return await this.userRepo.save(user);
    }
    async updateProfile(userId, payload) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error("User not found");
        }
        const nextEmail = payload.email?.trim();
        if (nextEmail && nextEmail !== user.email) {
            const duplicate = await this.userRepo.findOne({ where: { email: nextEmail } });
            if (duplicate && duplicate.id !== user.id) {
                throw new Error("Email already in use");
            }
            user.email = nextEmail;
        }
        if (payload.name !== undefined) {
            user.name = payload.name.trim();
        }
        if (payload.avatarUrl !== undefined) {
            user.avatarUrl = payload.avatarUrl?.trim() || undefined;
        }
        if (payload.phone !== undefined) {
            user.phone = payload.phone?.trim() || undefined;
        }
        await this.userRepo.save(user);
        return this.getCurrentUser(userId);
    }
    async changePassword(userId, currentPassword, newPassword) {
        if (!newPassword || newPassword.length < 8) {
            throw new Error("New password must be at least 8 characters");
        }
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ["id", "password"]
        });
        if (!user?.password) {
            throw new Error("Password change unavailable for this account");
        }
        const isCurrentValid = await (0, auth_1.comparePassword)(currentPassword, user.password);
        if (!isCurrentValid) {
            throw new Error("Current password is incorrect");
        }
        user.password = await (0, auth_1.hashPassword)(newPassword);
        await this.userRepo.save(user);
        return { message: "Password updated successfully" };
    }
    async requestForgotPasswordOtp(email) {
        const user = await this.userRepo.findOne({ where: { email } });
        // Avoid leaking user existence.
        if (!user) {
            return { message: "If this email exists, an OTP has been sent." };
        }
        const recent = await this.otpRepo.findOne({
            where: {
                user: { id: user.id },
                used: false,
                expiresAt: (0, typeorm_1.MoreThan)(new Date())
            },
            order: { createdAt: "DESC" }
        });
        if (recent && Date.now() - recent.createdAt.getTime() < 60000) {
            throw new Error("Please wait before requesting another OTP");
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await (0, auth_1.hashPassword)(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const record = this.otpRepo.create({
            user,
            otpHash,
            expiresAt,
            attempts: 0,
            used: false
        });
        await this.otpRepo.save(record);
        await this.emailService.sendOtp({ email: user.email, otp });
        return {
            message: "If this email exists, an OTP has been sent.",
            ...(process.env.NODE_ENV === "development" ? { devOtp: otp } : {})
        };
    }
    async resetPasswordWithOtp(email, otp, newPassword) {
        if (!newPassword || newPassword.length < 8) {
            throw new Error("New password must be at least 8 characters");
        }
        const user = await this.userRepo.findOne({
            where: { email },
            select: ["id", "password"]
        });
        if (!user) {
            throw new Error("Invalid OTP or email");
        }
        const record = await this.otpRepo
            .createQueryBuilder("otp")
            .addSelect("otp.otpHash")
            .leftJoinAndSelect("otp.user", "user")
            .where("user.id = :userId", { userId: user.id })
            .andWhere("otp.used = false")
            .andWhere("otp.expiresAt > :now", { now: new Date() })
            .orderBy("otp.createdAt", "DESC")
            .getOne();
        if (!record) {
            throw new Error("Invalid OTP or email");
        }
        if (record.attempts >= 5) {
            throw new Error("OTP has been locked due to too many attempts");
        }
        const isValidOtp = await (0, auth_1.comparePassword)(otp, record.otpHash);
        if (!isValidOtp) {
            record.attempts += 1;
            await this.otpRepo.save(record);
            throw new Error("Invalid OTP or email");
        }
        record.used = true;
        await this.otpRepo.save(record);
        user.password = await (0, auth_1.hashPassword)(newPassword);
        await this.userRepo.save(user);
        return { message: "Password reset successfully" };
    }
}
exports.AuthService = AuthService;
