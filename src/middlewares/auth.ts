import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";
import { UserRole } from "../entities/User";

declare global {
    namespace Express {
        interface User {
            id?: string;
            role?: UserRole;
        }
    }
}

export interface AuthRequest extends Request {
    user?: Express.User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }

    // Dual-layer: Session check
    const sessionRepo = AppDataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
        where: { token, isActive: true },
        relations: ["user"]
    });

    if (!session) {
        res.status(401).json({ message: "Session inactive or logged out" });
        return;
    }

    req.user = {
        id: decoded.id,
        role: decoded.role
    };

    next();
};

export const authorize = (roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.role || !roles.includes(req.user.role)) {
            res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            return;
        }
        next();
    };
};
