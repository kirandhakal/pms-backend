"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = exports.auditLog = void 0;
const data_source_1 = require("../config/data-source");
const AuditLog_1 = require("../entities/AuditLog");
/**
 * Audit logger middleware factory
 *
 * @example
 * router.post("/users",
 *   auditLog({ action: AuditAction.CREATE, resource: "users" }),
 *   createUserController
 * )
 */
const auditLog = (options) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json to capture response
        res.json = function (body) {
            // Log after response is sent
            setImmediate(async () => {
                try {
                    // Skip if condition met
                    if (options.skipCondition?.(req)) {
                        return;
                    }
                    // Only log successful operations (2xx)
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        return;
                    }
                    const auditRepo = data_source_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
                    const auditLog = auditRepo.create({
                        userId: req.user?.id,
                        action: options.action,
                        resource: options.resource,
                        resourceId: options.getResourceId?.(req) || req.params.id || body?.id,
                        description: options.getDescription?.(req),
                        oldValue: options.getOldValue?.(req),
                        newValue: options.getNewValue?.(req) || sanitizeRequestBody(req.body),
                        ipAddress: getClientIp(req),
                        userAgent: req.headers["user-agent"],
                        organizationId: req.tenant?.organizationId
                    });
                    await auditRepo.save(auditLog);
                }
                catch (error) {
                    console.error("Failed to create audit log:", error);
                }
            });
            return originalJson(body);
        };
        next();
    };
};
exports.auditLog = auditLog;
/**
 * Manual audit logging service
 */
class AuditService {
    constructor() {
        this.auditRepo = data_source_1.AppDataSource.getRepository(AuditLog_1.AuditLog);
    }
    async log(params) {
        const auditLog = this.auditRepo.create({
            ...params,
            metadata: params.metadata ? { context: params.metadata } : undefined
        });
        return this.auditRepo.save(auditLog);
    }
    async getAuditLogs(filters) {
        const query = this.auditRepo.createQueryBuilder("audit")
            .leftJoinAndSelect("audit.user", "user")
            .orderBy("audit.createdAt", "DESC");
        if (filters.userId) {
            query.andWhere("audit.userId = :userId", { userId: filters.userId });
        }
        if (filters.organizationId) {
            query.andWhere("audit.organizationId = :organizationId", { organizationId: filters.organizationId });
        }
        if (filters.resource) {
            query.andWhere("audit.resource = :resource", { resource: filters.resource });
        }
        if (filters.action) {
            query.andWhere("audit.action = :action", { action: filters.action });
        }
        if (filters.startDate) {
            query.andWhere("audit.createdAt >= :startDate", { startDate: filters.startDate });
        }
        if (filters.endDate) {
            query.andWhere("audit.createdAt <= :endDate", { endDate: filters.endDate });
        }
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;
        const [logs, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        return { logs, total };
    }
}
exports.AuditService = AuditService;
/**
 * Get client IP address
 */
function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
        return ips.split(",")[0].trim();
    }
    return req.socket?.remoteAddress || "unknown";
}
/**
 * Remove sensitive fields from request body before logging
 */
function sanitizeRequestBody(body) {
    if (!body || typeof body !== "object") {
        return undefined;
    }
    const sensitiveFields = ["password", "token", "secret", "apiKey", "refreshToken"];
    const sanitized = { ...body };
    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = "[REDACTED]";
        }
    }
    return sanitized;
}
// Export singleton instance
exports.auditService = new AuditService();
