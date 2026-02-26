import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";
import { UserRole } from "../entities/User";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Dual-layer: Session check
    const sessionRepo = AppDataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
        where: { token, isActive: true },
        relations: ["user"]
    });

    if (!session) {
        return res.status(401).json({ message: "Session inactive or logged out" });
    }

    if (!session.user || !session.user.isActive || session.expiresAt <= new Date()) {
        return res.status(401).json({ message: "Session expired or user inactive" });
    }

    req.user = {
        id: session.user.id,
        role: session.user.role
    };

    next();
};

export const authorizeRoles = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};

export const authorize = (roles: UserRole[]) => authorizeRoles(...roles);
