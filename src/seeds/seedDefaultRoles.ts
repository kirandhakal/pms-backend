import "reflect-metadata";
import { AppDataSource } from "../config/data-source";
import { Role } from "../entities/Role";
import { Permission } from "../entities/Permission";
import { 
    RoleLevel,
    DefaultRolePermissions,
    SystemRoles,
    PermissionResource,
    PermissionAction,
    PermissionScope
} from "../config/permissions";
import dotenv from "dotenv";

dotenv.config();

interface RoleDefinition {
    name: string;
    description: string;
    level: RoleLevel;
    isSystem: boolean;
}

const systemRoles: RoleDefinition[] = [
    {
        name: SystemRoles.SUDO_ADMIN,
        description: "System-wide administrator with full access to all resources",
        level: RoleLevel.SUDO_ADMIN,
        isSystem: true
    },
    {
        name: SystemRoles.SUPER_ADMIN,
        description: "Can manage multiple organizations",
        level: RoleLevel.SUPER_ADMIN,
        isSystem: true
    },
    {
        name: SystemRoles.ADMIN,
        description: "Organization administrator with full org-level control",
        level: RoleLevel.ADMIN,
        isSystem: true
    },
    {
        name: SystemRoles.DEPARTMENT_HEAD,
        description: "Department manager with department-level control",
        level: RoleLevel.DEPARTMENT_HEAD,
        isSystem: true
    },
    {
        name: SystemRoles.MANAGER,
        description: "Team/project manager",
        level: RoleLevel.MANAGER,
        isSystem: true
    },
    {
        name: SystemRoles.MEMBER,
        description: "Regular team member",
        level: RoleLevel.MEMBER,
        isSystem: true
    },
    {
        name: SystemRoles.GUEST,
        description: "Read-only guest access",
        level: RoleLevel.GUEST,
        isSystem: true
    }
];

async function seedDefaultRoles(): Promise<void> {
    console.log("🚀 Starting Default Roles seeder...\n");

    try {
        // Initialize database connection
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log("✅ Database connection established\n");
        }

        const roleRepo = AppDataSource.getRepository(Role);
        const permissionRepo = AppDataSource.getRepository(Permission);

        // Get all permissions for assignment
        const allPermissions = await permissionRepo.find();
        console.log(`📊 Found ${allPermissions.length} permissions\n`);

        if (allPermissions.length === 0) {
            console.log("⚠️  No permissions found. Run 'npm run seed:permissions' first.\n");
            return;
        }

        // Create permission lookup map
        const permissionMap = new Map<string, Permission>();
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
            } else {
                console.log(`   ℹ️  Role exists: ${roleDef.name}`);
            }

            // Assign permissions from DefaultRolePermissions
            const rolePermissions = DefaultRolePermissions[roleDef.name as keyof typeof DefaultRolePermissions] || [];
            const permissionsToAssign: Permission[] = [];

            for (const permDef of rolePermissions) {
                const key = `${permDef.resource}:${permDef.action}:${permDef.scope}`;
                const permission = permissionMap.get(key);
                
                if (permission) {
                    permissionsToAssign.push(permission);
                } else {
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

    } catch (error) {
        console.error("❌ Error seeding default roles:", error);
        throw error;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
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

export { seedDefaultRoles };
