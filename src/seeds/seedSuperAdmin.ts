import "reflect-metadata";
import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { hashPassword } from "../utils/auth";
import dotenv from "dotenv";

dotenv.config();

interface SuperAdminConfig {
    fullName: string;
    email: string;
    password: string;
}

const DEFAULT_SUPER_ADMIN: SuperAdminConfig = {
    fullName: process.env.SUPER_ADMIN_NAME || "Super Admin",
    email: process.env.SUPER_ADMIN_EMAIL || "admin@taskflow.com",
    password: process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin@123"
};

async function seedSuperAdmin(): Promise<void> {
    console.log("🚀 Starting Super Admin seeder...\n");

    try {
        // Initialize database connection
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log("✅ Database connection established\n");
        }

        const userRepository = AppDataSource.getRepository(User);

        // Check if super admin already exists
        const existingAdmin = await userRepository.findOne({
            where: { email: DEFAULT_SUPER_ADMIN.email }
        });

        if (existingAdmin) {
            console.log("ℹ️  Super Admin already exists:");
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Status: ${existingAdmin.isActive ? "Active" : "Inactive"}`);
            
            // Update to SUPER_ADMIN role if not already
            if (existingAdmin.role !== UserRole.SUPER_ADMIN) {
                existingAdmin.role = UserRole.SUPER_ADMIN;
                existingAdmin.isActive = true;
                await userRepository.save(existingAdmin);
                console.log("\n✅ Updated existing user to SUPER_ADMIN role");
            }
            
            console.log("\n🎉 Super Admin seeder completed!\n");
            return;
        }

        // Create new super admin
        const hashedPassword = await hashPassword(DEFAULT_SUPER_ADMIN.password);

        const superAdmin = userRepository.create({
            fullName: DEFAULT_SUPER_ADMIN.fullName,
            email: DEFAULT_SUPER_ADMIN.email,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
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
        console.log(`   │  Role:     ${UserRole.SUPER_ADMIN.padEnd(27)}│`);
        console.log("   └─────────────────────────────────────────┘");
        console.log("\n⚠️  Please change the password after first login!\n");
        console.log("🎉 Super Admin seeder completed!\n");

    } catch (error) {
        console.error("❌ Error seeding Super Admin:", error);
        throw error;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
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

export { seedSuperAdmin };
