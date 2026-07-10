import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";
import { UserRole } from "../entities/User";
import { Role } from "../entities/Role";

declare global {
    namespace Express {
        interface User {
            id: string;
            role?: Role;
            legacyRole?: UserRole;
            organizationId?: string;
            departmentId?: string;
            teamId?: string;
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

    const sessionRepo = AppDataSource.getRepository(Session);
    const session = await sessionRepo.findOne({
        where: { token, isActive: true },
        relations: ["user", "user.role", "user.team"]
    });

    if (!session) {
        res.status(401).json({ message: "Session inactive or logged out" });
        return;
    }

    if (!session.user || !session.user.isActive || session.expiresAt <= new Date()) {
        res.status(401).json({ message: "Session expired or user inactive" });
        return;
    }

    req.user = {
        id: session.user.id,
        role: session.user.role,
        legacyRole: session.user.legacyRole,
        organizationId: session.user.organizationId,
        departmentId: session.user.departmentId,
        teamId: session.user.team?.id,
    };

    next();
};

export const authorizeRoles = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const role = req.user?.legacyRole ?? (req.user?.role?.name as UserRole | undefined);
        if (!req.user || !role || !roles.includes(role)) {
            res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            return;
        }

        next();
    };
};

export const authorize = (roles: UserRole[]) => authorizeRoles(...roles);