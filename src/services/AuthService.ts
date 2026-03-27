import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { Session } from "../entities/Session";
import { Invitation } from "../entities/Invitation";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { MoreThan } from "typeorm";
import { ActivityAction } from "../entities/ActivityLog";
import { ActivityLogService } from "./ActivityLogService";
import { normalizeRole } from "../constants/access";
import { PermissionService } from "./PermissionService";
import { PasswordResetOtp } from "../entities/PasswordResetOtp";
import { EmailService } from "./EmailService";

export class AuthService {
    private userRepo = AppDataSource.getRepository(User);
    private sessionRepo = AppDataSource.getRepository(Session);
    private inviteRepo = AppDataSource.getRepository(Invitation);
    private otpRepo = AppDataSource.getRepository(PasswordResetOtp);
    private activityLogService = new ActivityLogService();
    private permissionService = new PermissionService();
    private emailService = new EmailService();

    async registerIndividual(data: { email: string; password: string; name: string }) {
        const { email, password, name } = data;

        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
            throw new Error("Email already registered");
        }

        const hashedPassword = await hashPassword(password);
        const user = this.userRepo.create({
            email,
            name,
            password: hashedPassword,
            role: UserRole.MEMBER
        });

        return this.userRepo.save(user);
    }

    async registerWithInvite(data: any) {
        return await AppDataSource.transaction(async (manager) => {
            const { email, password, name, token } = data;

            const existing = await manager.findOne(User, { where: { email } });
            if (existing) {
                throw new Error("Email already registered");
            }

            const invitation = await manager.findOne(Invitation, {
                where: { email, token, isUsed: false, expiresAt: MoreThan(new Date()) },
                relations: ["team"]
            });

            if (!invitation) {
                throw new Error("Invalid or expired invitation");
            }

            const hashedPassword = await hashPassword(password);
            const user = manager.create(User, {
                email,
                name,
                password: hashedPassword,
                role: normalizeRole(invitation.role),
                team: invitation.team
            });

            const savedUser = await manager.save(user);

            invitation.isUsed = true;
            await manager.save(invitation);

            if (invitation.team?.id) {
                await this.activityLogService.log({
                    action: ActivityAction.MEMBER_JOINED,
                    actorId: savedUser.id,
                    targetUserId: savedUser.id,
                    teamId: invitation.team.id,
                    details: `${savedUser.email} joined via invite`
                });
            }

            return savedUser;
        });
    }

    async login(email: string, password: string) {
        const user = await this.userRepo.findOne({
            where: { email },
            select: ["id", "password", "role", "name"]
        });

        if (!user || !(await comparePassword(password, user.password))) {
            throw new Error("Invalid credentials");
        }

        const token = generateToken({ id: user.id, role: user.role });

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
                role: normalizeRole(user.role)
            }
        };
    }

    async logout(token: string) {
        const session = await this.sessionRepo.findOne({ where: { token } });
        if (session) {
            session.isActive = false;
            await this.sessionRepo.save(session);
        }
    }

    async getCurrentUser(userId: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            relations: ["team", "team.createdBy"]
        });

        if (!user) {
            throw new Error("User not found");
        }

        const normalizedRole = normalizeRole(user.role);
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
    async createSuperAdmin(data: any) {
        const hashedPassword = await hashPassword(data.password);
        const user = this.userRepo.create({ ...data, password: hashedPassword, role: UserRole.SUPER_ADMIN });
        return await this.userRepo.save(user);
    }

    async updateProfile(userId: string, payload: { name?: string; email?: string; avatarUrl?: string; phone?: string }) {
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

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
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

        const isCurrentValid = await comparePassword(currentPassword, user.password);
        if (!isCurrentValid) {
            throw new Error("Current password is incorrect");
        }

        user.password = await hashPassword(newPassword);
        await this.userRepo.save(user);

        return { message: "Password updated successfully" };
    }

    async requestForgotPasswordOtp(email: string) {
        const user = await this.userRepo.findOne({ where: { email } });

        // Avoid leaking user existence.
        if (!user) {
            return { message: "If this email exists, an OTP has been sent." };
        }

        const recent = await this.otpRepo.findOne({
            where: {
                user: { id: user.id },
                used: false,
                expiresAt: MoreThan(new Date())
            },
            order: { createdAt: "DESC" }
        });

        if (recent && Date.now() - recent.createdAt.getTime() < 60_000) {
            throw new Error("Please wait before requesting another OTP");
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const otpHash = await hashPassword(otp);
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

    async resetPasswordWithOtp(email: string, otp: string, newPassword: string) {
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

        const isValidOtp = await comparePassword(otp, record.otpHash);
        if (!isValidOtp) {
            record.attempts += 1;
            await this.otpRepo.save(record);
            throw new Error("Invalid OTP or email");
        }

        record.used = true;
        await this.otpRepo.save(record);

        user.password = await hashPassword(newPassword);
        await this.userRepo.save(user);

        return { message: "Password reset successfully" };
    }
}
