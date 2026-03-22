import { AppDataSource } from "../config/data-source";
import { PermissionKey, DEFAULT_ROLE_PERMISSIONS, ROLE_LEVEL, normalizeRole } from "../constants/access";
import { OrganizationPermission } from "../entities/OrganizationPermission";
import { User, UserRole } from "../entities/User";

type FrontendPermission = {
    resource: string;
    action: string;
    scope: string;
};

const FRONTEND_PERMISSION_MAP: Record<PermissionKey, FrontendPermission[]> = {
    [PermissionKey.PROJECT_CREATE]: [{ resource: "workflows", action: "create", scope: "organization" }],
    [PermissionKey.VIEW_TEAM_ACTIVITY]: [{ resource: "audit_logs", action: "read", scope: "organization" }],
    [PermissionKey.VIEW_TEAM_ANALYTICS]: [{ resource: "reports", action: "read", scope: "organization" }],
    [PermissionKey.VIEW_TEAM_PROGRESS]: [{ resource: "dashboard", action: "read", scope: "organization" }],
    [PermissionKey.BROADCAST_SEND]: [{ resource: "organizations", action: "update", scope: "organization" }],
    [PermissionKey.BROADCAST_VIEW]: [{ resource: "organizations", action: "read", scope: "organization" }],
    [PermissionKey.MEMBER_MANAGE]: [{ resource: "users", action: "manage", scope: "organization" }],
    [PermissionKey.ROLE_ASSIGN]: [{ resource: "roles", action: "assign", scope: "organization" }]
};

export class PermissionService {
    private permissionRepo = AppDataSource.getRepository(OrganizationPermission);

    async getExplicitPermissions(userId: string, teamId?: string): Promise<PermissionKey[]> {
        const where = teamId
            ? { user: { id: userId }, team: { id: teamId } }
            : { user: { id: userId } };

        const records = await this.permissionRepo.find({ where });
        return records.map((record) => record.permission);
    }

    async getEffectivePermissions(user: User): Promise<Set<PermissionKey>> {
        const normalizedRole = normalizeRole(user.role);
        const defaults = DEFAULT_ROLE_PERMISSIONS[normalizedRole] ?? [];
        const explicit = await this.getExplicitPermissions(user.id, user.team?.id);

        const permissions = new Set<PermissionKey>([...defaults, ...explicit]);

        const isCreator = Boolean(user.team?.createdBy?.id && user.team.createdBy.id === user.id);
        if (isCreator) {
            Object.values(PermissionKey).forEach((permission) => permissions.add(permission));
        }

        return permissions;
    }

    async userHasPermission(user: User, permission: PermissionKey): Promise<boolean> {
        const permissions = await this.getEffectivePermissions(user);
        return permissions.has(permission);
    }

    getRoleLevel(inputRole: string | UserRole): number {
        return ROLE_LEVEL[normalizeRole(inputRole)];
    }

    toFrontendPermissions(permissionKeys: PermissionKey[]): FrontendPermission[] {
        return permissionKeys.flatMap((permission) => FRONTEND_PERMISSION_MAP[permission] ?? []);
    }
}
