import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { Session } from "../entities/Session";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { ApiError } from "../middlewares/errorHandler";

export class AuthService {
    private userRepo = AppDataSource.getRepository(User);
    private sessionRepo = AppDataSource.getRepository(Session);

    async register(data: { fullName: string; email: string; password: string }) {
        const existing = await this.userRepo.findOne({ where: { email: data.email } });
        if (existing) {
            throw new ApiError("Email is already in use", 409);
        }

        const user = this.userRepo.create({
            fullName: data.fullName,
            email: data.email,
            password: await hashPassword(data.password),
            role: UserRole.USER,
            isActive: true
        });

        const saved = await this.userRepo.save(user);
        return {
            id: saved.id,
            fullName: saved.fullName,
            email: saved.email,
            role: saved.role,
            isActive: saved.isActive,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt
        };
    }

    async login(email: string, password: string) {
        const user = await this.userRepo.findOne({
            where: { email },
            select: ["id", "password", "role", "fullName", "email", "isActive"]
        });

        if (!user || !(await comparePassword(password, user.password))) {
            throw new ApiError("Invalid credentials", 401);
        }

        if (!user.isActive) {
            throw new ApiError("User account is inactive", 403);
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
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isActive: user.isActive
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
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        return {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }

    async updateProfile(userId: string, data: { fullName?: string; email?: string }) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        if (data.email && data.email !== user.email) {
            const existing = await this.userRepo.findOne({ where: { email: data.email } });
            if (existing && existing.id !== userId) {
                throw new ApiError("Email is already in use", 409);
            }
            user.email = data.email;
        }

        if (data.fullName) {
            user.fullName = data.fullName;
        }

        const saved = await this.userRepo.save(user);
        return {
            id: saved.id,
            fullName: saved.fullName,
            email: saved.email,
            role: saved.role,
            isActive: saved.isActive,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt
        };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ["id", "password"]
        });

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            throw new ApiError("Current password is incorrect", 400);
        }

        user.password = await hashPassword(newPassword);
        await this.userRepo.save(user);

        await this.sessionRepo
            .createQueryBuilder()
            .update(Session)
            .set({ isActive: false })
            .where("\"userId\" = :userId", { userId })
            .andWhere("\"isActive\" = :isActive", { isActive: true })
            .execute();

        return { message: "Password changed successfully. Please login again." };
    }

    async createAdmin(data: { fullName: string; email: string; password: string }) {
        const existing = await this.userRepo.findOne({ where: { email: data.email } });
        if (existing) {
            throw new ApiError("Email is already in use", 409);
        }

        const user = this.userRepo.create({
            fullName: data.fullName,
            email: data.email,
            password: await hashPassword(data.password),
            role: UserRole.ADMIN,
            isActive: true
        });

        const saved = await this.userRepo.save(user);

        return {
            id: saved.id,
            fullName: saved.fullName,
            email: saved.email,
            role: saved.role,
            isActive: saved.isActive,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt
        };
    }

    async createSuperAdmin(data: { fullName: string; email: string; password: string }) {
        const exists = await this.userRepo.findOne({ where: { role: UserRole.SUPER_ADMIN } });
        if (exists) {
            throw new ApiError("Super admin already exists", 409);
        }

        const existingEmail = await this.userRepo.findOne({ where: { email: data.email } });
        if (existingEmail) {
            throw new ApiError("Email is already in use", 409);
        }

        const user = this.userRepo.create({
            fullName: data.fullName,
            email: data.email,
            password: await hashPassword(data.password),
            role: UserRole.SUPER_ADMIN,
            isActive: true
        });

        const saved = await this.userRepo.save(user);

        return {
            id: saved.id,
            fullName: saved.fullName,
            email: saved.email,
            role: saved.role,
            isActive: saved.isActive,
            createdAt: saved.createdAt,
            updatedAt: saved.updatedAt
        };
    }
}
