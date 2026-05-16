"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteSchema = void 0;
const zod_1 = require("zod");
const User_1 = require("../entities/User");
exports.inviteSchema = zod_1.z.object({
    email: zod_1.z.email().trim().toLowerCase(),
    role: zod_1.z.nativeEnum(User_1.UserRole),
    projectId: zod_1.z.uuid().optional()
});
