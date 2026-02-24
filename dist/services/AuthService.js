"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const Session_1 = require("../entities/Session");
const auth_1 = require("../utils/auth");
const errorHandler_1 = require("../middlewares/errorHandler");
class AuthService {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
    }
    async register(data) {
        const existing = await this.userRepo.findOne({ where: { email: data.email } });
        if (existing) {
            throw new errorHandler_1.ApiError("Email is already in use", 409);
        }
        const user = this.userRepo.create({
            fullName: data.fullName,
            email: data.email,
            password: await (0, auth_1.hashPassword)(data.password),
            role: User_1.UserRole.USER,
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
    async login(email, password) {
        const user = await this.userRepo.findOne({
            where: { email },
            select: ["id", "password", "role", "fullName", "email", "isActive"]
        });
        if (!user || !(await (0, auth_1.comparePassword)(password, user.password))) {
            throw new errorHandler_1.ApiError("Invalid credentials", 401);
        }
        if (!user.isActive) {
            throw new errorHandler_1.ApiError("User account is inactive", 403);
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
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isActive: user.isActive
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
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new errorHandler_1.ApiError("User not found", 404);
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
    async updateProfile(userId, data) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new errorHandler_1.ApiError("User not found", 404);
        }
        if (data.email && data.email !== user.email) {
            const existing = await this.userRepo.findOne({ where: { email: data.email } });
            if (existing && existing.id !== userId) {
                throw new errorHandler_1.ApiError("Email is already in use", 409);
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
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.userRepo.findOne({
            where: { id: userId },
            select: ["id", "password"]
        });
        if (!user) {
            throw new errorHandler_1.ApiError("User not found", 404);
        }
        const isMatch = await (0, auth_1.comparePassword)(currentPassword, user.password);
        if (!isMatch) {
            throw new errorHandler_1.ApiError("Current password is incorrect", 400);
        }
        user.password = await (0, auth_1.hashPassword)(newPassword);
        await this.userRepo.save(user);
        await this.sessionRepo
            .createQueryBuilder()
            .update(Session_1.Session)
            .set({ isActive: false })
            .where("\"userId\" = :userId", { userId })
            .andWhere("\"isActive\" = :isActive", { isActive: true })
            .execute();
        return { message: "Password changed successfully. Please login again." };
    }
    async createAdmin(data) {
        const existing = await this.userRepo.findOne({ where: { email: data.email } });
        if (existing) {
            throw new errorHandler_1.ApiError("Email is already in use", 409);
        }
        const user = this.userRepo.create({
            fullName: data.fullName,
            email: data.email,
            password: await (0, auth_1.hashPassword)(data.password),
            role: User_1.UserRole.ADMIN,
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
    async createSuperAdmin(data) {
        const exists = await this.userRepo.findOne({ where: { role: User_1.UserRole.SUPER_ADMIN } });
        if (exists) {
            throw new errorHandler_1.ApiError("Super admin already exists", 409);
        }
        const existingEmail = await this.userRepo.findOne({ where: { email: data.email } });
        if (existingEmail) {
            throw new errorHandler_1.ApiError("Email is already in use", 409);
        }
        const user = this.userRepo.create({
            fullName: data.fullName,
            email: data.email,
            password: await (0, auth_1.hashPassword)(data.password),
            role: User_1.UserRole.SUPER_ADMIN,
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
exports.AuthService = AuthService;
