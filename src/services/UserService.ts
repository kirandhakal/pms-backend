import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { hashPassword } from "../utils/auth";
import { ApiError } from "../middlewares/errorHandler";

export class UserService {
    private userRepo = AppDataSource.getRepository(User);

    async getAllUsers() {
        return await this.userRepo.find({
            select: ["id", "fullName", "email", "role", "isActive", "createdAt", "updatedAt"],
            order: { createdAt: "DESC" }
        });
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
}
