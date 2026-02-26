"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2).max(100),
    email: zod_1.z.email().trim().toLowerCase(),
    password: zod_1.z.string().min(8).max(128)
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.email().trim().toLowerCase(),
    password: zod_1.z.string().min(1)
});
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2).max(100).optional(),
    email: zod_1.z.email().trim().toLowerCase().optional()
}).refine((value) => Boolean(value.fullName || value.email), {
    message: "At least one field is required"
});
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(128)
});
exports.createAdminSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2).max(100),
    email: zod_1.z.email().trim().toLowerCase(),
    password: zod_1.z.string().min(8).max(128)
});
