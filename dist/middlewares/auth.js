"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const data_source_1 = require("../config/data-source");
const Session_1 = require("../entities/Session");
const access_1 = require("../constants/access");
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
    // Dual-layer: Session check
    const sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
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
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        const normalizedRole = (0, access_1.normalizeRole)(req.user?.role);
        if (!roles.includes(normalizedRole)) {
            res.status(403).json({ message: "Forbidden: Insufficient permissions" });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
