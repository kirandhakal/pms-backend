import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";
import { UserRole, User } from "../entities/User";
import { Role } from "../entities/Role";

declare global {
    namespace Express {
        interface User {
            id?: string;
            role?: UserRole;
        }
    }
}

export interface AuthRequest extends Request {
<<<<<<< HEAD
    user?: Express.User;
=======
    user?: {
        id: string;
        role?: Role;
        legacyRole: UserRole;
        organizationId?: string;
        departmentId?: string;
    };
>>>>>>> new/rafc
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
        relations: ["user", "user.role", "user.role.permissions"]
    });

    if (!session) {
        res.status(401).json({ message: "Session inactive or logged out" });
        return;
    }

    if (!session.user || !session.user.isActive || session.expiresAt <= new Date()) {
        return res.status(401).json({ message: "Session expired or user inactive" });
    }

    req.user = {
        id: session.user.id,
        role: session.user.role,
        legacyRole: session.user.legacyRole,
        organizationId: session.user.organizationId,
        departmentId: session.user.departmentId
    };

    next();
};

export const authorizeRoles = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
<<<<<<< HEAD
        if (!req.user?.role || !roles.includes(req.user.role)) {
            res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            return;
=======
        if (!req.user || !roles.includes(req.user.legacyRole)) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
>>>>>>> new/rafc
        }
        next();
    };
};

export const authorize = (roles: UserRole[]) => authorizeRoles(...roles);
