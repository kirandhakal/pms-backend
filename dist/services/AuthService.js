"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const Session_1 = require("../entities/Session");
const Invitation_1 = require("../entities/Invitation");
const auth_1 = require("../utils/auth");
const typeorm_1 = require("typeorm");
class AuthService {
    constructor() {
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
        this.inviteRepo = data_source_1.AppDataSource.getRepository(Invitation_1.Invitation);
    }
    async registerWithInvite(data) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const { email, password, name, token } = data;
            const invitation = await manager.findOne(Invitation_1.Invitation, {
                where: { email, token, isUsed: false, expiresAt: (0, typeorm_1.MoreThan)(new Date()) }
            });
            if (!invitation) {
                throw new Error("Invalid or expired invitation");
            }
            const hashedPassword = await (0, auth_1.hashPassword)(password);
            const user = manager.create(User_1.User, {
                email,
                name,
                password: hashedPassword,
                role: invitation.role
            });
            const savedUser = await manager.save(user);
            invitation.isUsed = true;
            await manager.save(invitation);
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
        return { token, user: { id: user.id, name: user.name, role: user.role } };
    }
    async logout(token) {
        const session = await this.sessionRepo.findOne({ where: { token } });
        if (session) {
            session.isActive = false;
            await this.sessionRepo.save(session);
        }
    }
    // SuperAdmin initial setup (Internal or via first user logic)
    async createSuperAdmin(data) {
        const hashedPassword = await (0, auth_1.hashPassword)(data.password);
        const user = this.userRepo.create({ ...data, password: hashedPassword, role: User_1.UserRole.SUPER_ADMIN });
        return await this.userRepo.save(user);
    }
}
exports.AuthService = AuthService;
