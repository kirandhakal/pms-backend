"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authorizeRoles = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const data_source_1 = require("../config/data-source");
const Session_1 = require("../entities/Session");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const token = authHeader.split(" ")[1];
    const decoded = (0, auth_1.verifyToken)(token);
    if (!decoded) {
        res.status(401).json({ message: "Invalid or expired token" });
        return;
    }
    const sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
    const session = await sessionRepo.findOne({
        where: { token, isActive: true },
        relations: ["user"]
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
        role: session.user.legacyRole,
        legacyRole: session.user.legacyRole
    };
    next();
};
exports.authenticate = authenticate;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const role = req.user?.role ?? req.user?.legacyRole;
        if (!req.user || !role || !roles.includes(role)) {
            res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
const authorize = (roles) => (0, exports.authorizeRoles)(...roles);
exports.authorize = authorize;
