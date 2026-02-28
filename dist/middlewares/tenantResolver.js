"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTenantAccess = exports.requireTenant = exports.resolveTenant = void 0;
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const Organization_1 = require("../entities/Organization");
/**
 * Resolve tenant context from request
 * Priority: Header > Path param > User's organization
 */
const resolveTenant = async (req, res, next) => {
    try {
        let organizationId;
        // 1. Check X-Organization-Id header (for multi-org users)
        const headerOrgId = req.headers["x-organization-id"];
        if (headerOrgId) {
            organizationId = headerOrgId;
        }
        // 2. Check path parameter
        if (!organizationId && req.params.organizationId && typeof req.params.organizationId === 'string') {
            organizationId = req.params.organizationId;
        }
        // 3. Fall back to user's organization
        if (!organizationId && req.user) {
            const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
            const user = await userRepo.findOne({
                where: { id: req.user.id },
                select: ["organizationId"]
            });
            organizationId = user?.organizationId;
        }
        if (organizationId) {
            const orgRepo = data_source_1.AppDataSource.getRepository(Organization_1.Organization);
            const organization = await orgRepo.findOne({
                where: { id: organizationId, isActive: true }
            });
            if (organization) {
                req.tenant = {
                    organizationId,
                    organization
                };
            }
        }
        next();
    }
    catch (error) {
        console.error("Error resolving tenant:", error);
        next();
    }
};
exports.resolveTenant = resolveTenant;
/**
 * Require tenant context - fails if no organization is resolved
 */
const requireTenant = async (req, res, next) => {
    if (!req.tenant?.organizationId) {
        return res.status(400).json({
            message: "Organization context required",
            hint: "Provide X-Organization-Id header or organizationId in request"
        });
    }
    next();
};
exports.requireTenant = requireTenant;
/**
 * Validate user has access to the resolved tenant
 */
const validateTenantAccess = async (req, res, next) => {
    if (!req.user || !req.tenant) {
        return next();
    }
    // System admins can access any tenant
    if (req.userContext && req.userContext.roleLevel <= 1) {
        return next();
    }
    // Verify user belongs to this organization
    if (req.userContext?.organizationId !== req.tenant.organizationId) {
        return res.status(403).json({
            message: "Access denied to this organization"
        });
    }
    next();
};
exports.validateTenantAccess = validateTenantAccess;
