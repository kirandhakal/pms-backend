import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

export class AuthController {
    async register(req: Request, res: Response) {
        try {
            const user = await authService.registerWithInvite(req.body);
            res.status(201).json(user);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json(result);
        } catch (err: any) {
            res.status(401).json({ message: err.message });
        }
    }

    async logout(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(" ")[1];
            if (token) {
                await authService.logout(token);
            }
            res.json({ message: "Logged out successfully" });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async setupSuperAdmin(req: Request, res: Response) {
        try {
            // This should be protected or only allowed once
            const user = await authService.createSuperAdmin(req.body);
            res.status(201).json(user);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }
}
