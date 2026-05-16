"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultRoles = seedDefaultRoles;
require("reflect-metadata");
const data_source_1 = require("../config/data-source");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
const permissions_1 = require("../config/permissions");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const systemRoles = [
    {
        name: permissions_1.SystemRoles.SUDO_ADMIN,
        description: "System-wide administrator with full access to all resources",
        level: permissions_1.RoleLevel.SUDO_ADMIN,
        isSystem: true
    },
    {
        name: permissions_1.SystemRoles.SUPER_ADMIN,
        description: "Can manage multiple organizations",
        level: permissions_1.RoleLevel.SUPER_ADMIN,
        isSystem: true
    },
    {
        name: permissions_1.SystemRoles.ADMIN,
        description: "Organization administrator with full org-level control",
        level: permissions_1.RoleLevel.ADMIN,
        isSystem: true
    },
    {
        name: permissions_1.SystemRoles.DEPARTMENT_HEAD,
        description: "Department manager with department-level control",
        level: permissions_1.RoleLevel.DEPARTMENT_HEAD,
        isSystem: true
    },
    {
        name: permissions_1.SystemRoles.MANAGER,
        description: "Team/project manager",
        level: permissions_1.RoleLevel.MANAGER,
        isSystem: true
    },
    {
        name: permissions_1.SystemRoles.MEMBER,
        description: "Regular team member",
        level: permissions_1.RoleLevel.MEMBER,
        isSystem: true
    },
    {
        name: permissions_1.SystemRoles.GUEST,
        description: "Read-only guest access",
        level: permissions_1.RoleLevel.GUEST,
        isSystem: true
    }
];
async function seedDefaultRoles() {
    console.log("🚀 Starting Default Roles seeder...\n");
    try {
        // Initialize database connection
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
            console.log("✅ Database connection established\n");
        }
        const roleRepo = data_source_1.AppDataSource.getRepository(Role_1.Role);
        const permissionRepo = data_source_1.AppDataSource.getRepository(Permission_1.Permission);
        // Get all permissions for assignment
        const allPermissions = await permissionRepo.find();
        console.log(`📊 Found ${allPermissions.length} permissions\n`);
        if (allPermissions.length === 0) {
            console.log("⚠️  No permissions found. Run 'npm run seed:permissions' first.\n");
            return;
        }
        // Create permission lookup map
        const permissionMap = new Map();
        for (const perm of allPermissions) {
            const key = `${perm.resource}:${perm.action}:${perm.scope}`;
            permissionMap.set(key, perm);
        }
        console.log("Creating/updating system roles...\n");
        for (const roleDef of systemRoles) {
            // Check if role exists
            let role = await roleRepo.findOne({
                where: { name: roleDef.name, isSystem: true }
            });
            if (!role) {
                role = roleRepo.create({
                    name: roleDef.name,
                    description: roleDef.description,
                    level: roleDef.level,
                    isSystem: true,
                    isActive: true,
                    organizationId: undefined // System roles are not org-specific
                });
                await roleRepo.save(role);
                console.log(`   ✨ Created role: ${roleDef.name}`);
            }
            else {
                console.log(`   ℹ️  Role exists: ${roleDef.name}`);
            }
            // Assign permissions from DefaultRolePermissions
            const rolePermissions = permissions_1.DefaultRolePermissions[roleDef.name] || [];
            const permissionsToAssign = [];
            for (const permDef of rolePermissions) {
                const key = `${permDef.resource}:${permDef.action}:${permDef.scope}`;
                const permission = permissionMap.get(key);
                if (permission) {
                    permissionsToAssign.push(permission);
                }
                else {
                    console.log(`      ⚠️  Permission not found: ${key}`);
                }
            }
            // Update role permissions
            role.permissions = permissionsToAssign;
            await roleRepo.save(role);
            console.log(`      📋 Assigned ${permissionsToAssign.length} permissions to ${roleDef.name}`);
        }
        // Summary
        console.log("\n📋 Role Summary:");
        console.log("   ┌─────────────────────┬───────┬─────────────┐");
        console.log("   │ Role                │ Level │ Permissions │");
        console.log("   ├─────────────────────┼───────┼─────────────┤");
        for (const roleDef of systemRoles) {
            const role = await roleRepo.findOne({
                where: { name: roleDef.name },
                relations: ["permissions"]
            });
            const permCount = role?.permissions?.length || 0;
            console.log(`   │ ${roleDef.name.padEnd(19)} │ ${roleDef.level.toString().padEnd(5)} │ ${permCount.toString().padStart(11)} │`);
        }
        console.log("   └─────────────────────┴───────┴─────────────┘");
        console.log("\n🎉 Default Roles seeder completed!\n");
    }
    catch (error) {
        console.error("❌ Error seeding default roles:", error);
        throw error;
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
            console.log("📦 Database connection closed\n");
        }
    }
}
// Run if called directly
seedDefaultRoles()
    .then(() => {
    process.exit(0);
})
    .catch((error) => {
    console.error("Failed to seed default roles:", error);
    process.exit(1);
});
