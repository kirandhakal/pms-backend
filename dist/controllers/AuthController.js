"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const errorHandler_1 = require("../middlewares/errorHandler");
const authService = new AuthService_1.AuthService();
class AuthController {
    async register(req, res, next) {
        try {
            const user = await authService.register(req.body);
            res.status(201).json(user);
        }
        catch (err) {
            next(err);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async logout(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(" ")[1];
            if (token) {
                await authService.logout(token);
            }
            res.json({ message: "Logged out successfully" });
        }
        catch (err) {
            next(err);
        }
    }
    async setupSuperAdmin(req, res, next) {
        try {
            const user = await authService.createSuperAdmin(req.body);
            res.status(201).json(user);
        }
        catch (err) {
            next(err);
        }
    }
    async getCurrentUser(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const user = await authService.getCurrentUser(req.user.id);
            res.json(user);
        }
        catch (err) {
            next(err);
        }
    }
    async updateProfile(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const user = await authService.updateProfile(req.user.id, req.body);
            res.json(user);
        }
        catch (err) {
            next(err);
        }
    }
    async changePassword(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const result = await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
