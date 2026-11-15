import { ApiError } from "./errorHandler";
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
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const token = authHeader.split(" ")[1];
        const session = await authenticateToken(token);

        req.user = {
            id: session.user.id,
            role: session.user.role,
            legacyRole: session.user.legacyRole,
            organizationId: session.user.organizationId,
            departmentId: session.user.departmentId,
            teamId: session.user.team?.id,
        };

        next();
    } catch (error) {
        next(error);
    }
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
export async function authenticateToken(token: string) {
    if (!verifyToken(token)) {
        throw new ApiError("Invalid or expired token", 401);
    }
    const session = await AppDataSource.getRepository(Session).findOne({
        where: { token, isActive: true },
        relations: ["user", "user.role", "user.team"],
    });
    if (!session) throw new ApiError("Session inactive or logged out", 401);
    if (!session.user || !session.user.isActive || session.expiresAt <= new Date()) {
        throw new ApiError("Session expired or user inactive", 401);
    }
    return session;
}
