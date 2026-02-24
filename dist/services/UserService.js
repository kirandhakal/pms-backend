"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const auth_1 = require("../utils/auth");
const errorHandler_1 = require("../middlewares/errorHandler");
class UserService {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    async getAllUsers() {
        return await this.userRepo.find({
            select: ["id", "fullName", "email", "role", "isActive", "createdAt", "updatedAt"],
            order: { createdAt: "DESC" }
        });
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
}
exports.UserService = UserService;
