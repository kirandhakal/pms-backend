import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    ManyToMany,
    Index,
    Unique
} from "typeorm";
import { Role } from "./Role";
import { PermissionResource, PermissionAction, PermissionScope } from "../config/permissions";

@Entity("permissions")
@Unique(["resource", "action", "scope"])
export class Permission {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({
        type: "enum",
        enum: PermissionResource
    })
    @Index()
    resource!: PermissionResource;

    @Column({
        type: "enum",
        enum: PermissionAction
    })
    @Index()
    action!: PermissionAction;

    @Column({
        type: "enum",
        enum: PermissionScope
    })
    @Index()
    scope!: PermissionScope;

    @Column({ type: "text", nullable: true })
    description?: string;

    @ManyToMany(() => Role, (role) => role.permissions)
    roles!: Role[];

    /**
     * Get the permission string representation
     */
    toString(): string {
        return `${this.resource}:${this.action}:${this.scope}`;
    }
}
