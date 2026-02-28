"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPermissions = seedPermissions;
require("reflect-metadata");
const data_source_1 = require("../config/data-source");
const Permission_1 = require("../entities/Permission");
const permissions_1 = require("../config/permissions");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Permission descriptions for better UX
 */
const permissionDescriptions = {
    "users:create": "Create new users",
    "users:read": "View user information",
    "users:update": "Update user profiles",
    "users:delete": "Delete users",
    "users:manage": "Full user management",
    "organizations:create": "Create organizations",
    "organizations:read": "View organization details",
    "organizations:update": "Update organization settings",
    "organizations:delete": "Delete organizations",
    "organizations:manage": "Full organization management",
    "departments:create": "Create departments",
    "departments:read": "View department details",
    "departments:update": "Update department settings",
    "departments:delete": "Delete departments",
    "departments:manage": "Full department management",
    "workflows:create": "Create workflows",
    "workflows:read": "View workflows",
    "workflows:update": "Update workflows",
    "workflows:delete": "Delete workflows",
    "workflows:manage": "Full workflow management",
    "tasks:create": "Create tasks",
    "tasks:read": "View tasks",
    "tasks:update": "Update tasks",
    "tasks:delete": "Delete tasks",
    "tasks:manage": "Full task management",
    "tasks:assign": "Assign tasks to users",
    "invitations:create": "Send invitations",
    "invitations:read": "View invitations",
    "invitations:delete": "Revoke invitations",
    "invitations:manage": "Full invitation management",
    "roles:create": "Create roles",
    "roles:read": "View roles",
    "roles:update": "Update roles",
    "roles:delete": "Delete roles",
    "roles:manage": "Full role management",
    "permissions:read": "View permissions",
    "permissions:manage": "Manage permissions",
    "settings:read": "View settings",
    "settings:update": "Update settings",
    "settings:manage": "Full settings management",
    "audit_logs:read": "View audit logs",
    "dashboard:read": "View dashboard",
    "reports:export": "Export reports"
};
async function seedPermissions() {
    console.log("🚀 Starting Permission seeder...\n");
    try {
        // Initialize database connection
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
            console.log("✅ Database connection established\n");
        }
        const permissionRepo = data_source_1.AppDataSource.getRepository(Permission_1.Permission);
        // Get existing permissions
        const existingPermissions = await permissionRepo.find();
        const existingSet = new Set(existingPermissions.map(p => `${p.resource}:${p.action}:${p.scope}`));
        console.log(`📊 Found ${existingPermissions.length} existing permissions\n`);
        // Generate all permissions
        const allPermissions = [];
        let newCount = 0;
        for (const resource of Object.values(permissions_1.PermissionResource)) {
            for (const action of Object.values(permissions_1.PermissionAction)) {
                for (const scope of Object.values(permissions_1.PermissionScope)) {
                    const key = `${resource}:${action}:${scope}`;
                    if (!existingSet.has(key)) {
                        const permission = permissionRepo.create({
                            resource,
                            action,
                            scope,
                            description: permissionDescriptions[`${resource}:${action}`] ||
                                `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource} (${scope} scope)`
                        });
                        allPermissions.push(permission);
                        newCount++;
                    }
                }
            }
        }
        if (allPermissions.length > 0) {
            await permissionRepo.save(allPermissions);
            console.log(`✅ Created ${newCount} new permissions\n`);
        }
        else {
            console.log("ℹ️  All permissions already exist\n");
        }
        // Summary
        const totalPermissions = await permissionRepo.count();
        console.log("📋 Permission Summary:");
        console.log(`   Total permissions: ${totalPermissions}`);
        console.log(`   Resources: ${Object.values(permissions_1.PermissionResource).length}`);
        console.log(`   Actions: ${Object.values(permissions_1.PermissionAction).length}`);
        console.log(`   Scopes: ${Object.values(permissions_1.PermissionScope).length}`);
        console.log("\n🎉 Permission seeder completed!\n");
    }
    catch (error) {
        console.error("❌ Error seeding permissions:", error);
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
seedPermissions()
    .then(() => {
    process.exit(0);
})
    .catch((error) => {
    console.error("Failed to seed permissions:", error);
    process.exit(1);
});
