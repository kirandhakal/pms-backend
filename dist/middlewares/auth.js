"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const auth_1 = require("../utils/auth");
const data_source_1 = require("../config/data-source");
const Session_1 = require("../entities/Session");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = (0, auth_1.verifyToken)(token);
    if (!decoded) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
    // Dual-layer: Session check
    const sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
    const session = await sessionRepo.findOne({
        where: { token, isActive: true },
        relations: ["user"]
    });
    if (!session) {
        return res.status(401).json({ message: "Session inactive or logged out" });
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
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
        }
        next();
    };
};
exports.authorize = authorize;
