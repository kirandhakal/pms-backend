"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authorizeRoles = exports.authenticate = void 0;
exports.authenticateToken = authenticateToken;
const errorHandler_1 = require("./errorHandler");
const auth_1 = require("../utils/auth");
const data_source_1 = require("../config/data-source");
const Session_1 = require("../entities/Session");
const authenticate = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const role = req.user?.legacyRole ?? req.user?.role?.name;
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
async function authenticateToken(token) {
    if (!(0, auth_1.verifyToken)(token)) {
        throw new errorHandler_1.ApiError("Invalid or expired token", 401);
    }
    const session = await data_source_1.AppDataSource.getRepository(Session_1.Session).findOne({
        where: { token, isActive: true },
        relations: ["user", "user.role", "user.team"],
    });
    if (!session)
        throw new errorHandler_1.ApiError("Session inactive or logged out", 401);
    if (!session.user || !session.user.isActive || session.expiresAt <= new Date()) {
        throw new errorHandler_1.ApiError("Session expired or user inactive", 401);
    }
    return session;
}
