import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { AuthRequest } from "../middlewares/auth";
import { ApiError } from "../middlewares/errorHandler";

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await authService.register(req.body);
            res.status(201).json(user);
        } catch (err: any) {
            next(err);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json(result);
        } catch (err: any) {
            next(err);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(" ")[1];
            if (token) {
                await authService.logout(token);
            }
            res.json({ message: "Logged out successfully" });
        } catch (err: any) {
            next(err);
        }
    }

    async setupSuperAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await authService.createSuperAdmin(req.body);
            res.status(201).json(user);
        } catch (err: any) {
            next(err);
        }
    }

    async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const user = await authService.getCurrentUser(req.user.id);
            res.json(user);
        } catch (err: any) {
            next(err);
        }
    }

    async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const user = await authService.updateProfile(req.user.id, req.body);
            res.json(user);
        } catch (err: any) {
            next(err);
        }
    }

    async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }

            const result = await authService.changePassword(
                req.user.id,
                req.body.currentPassword,
                req.body.newPassword
            );

            res.json(result);
        } catch (err: any) {
            next(err);
        }
    }
}
