"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = seedSuperAdmin;
require("reflect-metadata");
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const Role_1 = require("../entities/Role");
const auth_1 = require("../utils/auth");
const permissions_1 = require("../config/permissions");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DEFAULT_SUPER_ADMIN = {
    fullName: process.env.SUPER_ADMIN_NAME || "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL || "admin@taskflow.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123"
};
async function seedSuperAdmin() {
    console.log("🚀 Starting Super Admin seeder...\n");
    try {
        // Initialize database connection
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
            console.log("✅ Database connection established\n");
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const roleRepository = data_source_1.AppDataSource.getRepository(Role_1.Role);
        // Find or create SUDO_ADMIN role
        let sudoAdminRole = await roleRepository.findOne({
            where: { name: permissions_1.SystemRoles.SUDO_ADMIN, isSystem: true }
        });
        if (!sudoAdminRole) {
            console.log("⚠️  SUDO_ADMIN role not found. Creating basic role...");
            sudoAdminRole = roleRepository.create({
                name: permissions_1.SystemRoles.SUDO_ADMIN,
                description: "System-wide administrator with full access",
                level: permissions_1.RoleLevel.SUDO_ADMIN,
                isSystem: true,
                isActive: true
            });
            await roleRepository.save(sudoAdminRole);
            console.log("✅ Created SUDO_ADMIN role\n");
        }
        // Check if super admin already exists
        const existingAdmin = await userRepository.findOne({
            where: { email: DEFAULT_SUPER_ADMIN.email },
            relations: ["role"]
        });
        if (existingAdmin) {
            console.log("ℹ️  Super Admin already exists:");
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Legacy Role: ${existingAdmin.legacyRole}`);
            console.log(`   Role: ${existingAdmin.role?.name || "None"}`);
            console.log(`   Status: ${existingAdmin.isActive ? "Active" : "Inactive"}`);
            // Update to use new role system if not already
            let needsUpdate = false;
            if (existingAdmin.legacyRole !== User_1.UserRole.SUDO_ADMIN) {
                existingAdmin.legacyRole = User_1.UserRole.SUDO_ADMIN;
                needsUpdate = true;
            }
            if (!existingAdmin.roleId || existingAdmin.roleId !== sudoAdminRole.id) {
                existingAdmin.roleId = sudoAdminRole.id;
                existingAdmin.role = sudoAdminRole;
                needsUpdate = true;
            }
            existingAdmin.isActive = true;
            if (needsUpdate) {
                await userRepository.save(existingAdmin);
                console.log("\n✅ Updated existing user with SUDO_ADMIN role");
            }
            console.log("\n🎉 Super Admin seeder completed!\n");
            return;
        }
        // Create new super admin
        const hashedPassword = await (0, auth_1.hashPassword)(DEFAULT_SUPER_ADMIN.password);
        const superAdmin = userRepository.create({
            fullName: DEFAULT_SUPER_ADMIN.fullName,
            email: DEFAULT_SUPER_ADMIN.email,
            password: hashedPassword,
            legacyRole: User_1.UserRole.SUDO_ADMIN,
            roleId: sudoAdminRole.id,
            isActive: true
        });
        await userRepository.save(superAdmin);
        console.log("✅ Super Admin created successfully!\n");
        console.log("   ┌─────────────────────────────────────────┐");
        console.log("   │         SUPER ADMIN CREDENTIALS         │");
        console.log("   ├─────────────────────────────────────────┤");
        console.log(`   │  Name:     ${DEFAULT_SUPER_ADMIN.fullName.padEnd(27)}│`);
        console.log(`   │  Email:    ${DEFAULT_SUPER_ADMIN.email.padEnd(27)}│`);
        console.log(`   │  Password: ${DEFAULT_SUPER_ADMIN.password.padEnd(27)}│`);
        console.log(`   │  Role:     ${permissions_1.SystemRoles.SUDO_ADMIN.padEnd(27)}│`);
        console.log("   └─────────────────────────────────────────┘");
        console.log("\n⚠️  Please change the password after first login!\n");
        console.log("🎉 Super Admin seeder completed!\n");
    }
    catch (error) {
        console.error("❌ Error seeding Super Admin:", error);
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
seedSuperAdmin()
    .then(() => {
    process.exit(0);
})
    .catch((error) => {
    console.error("Failed to seed Super Admin:", error);
    process.exit(1);
});
