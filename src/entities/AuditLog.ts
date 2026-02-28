import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    ManyToOne,
    JoinColumn,
    Index
} from "typeorm";
import { User } from "./User";
import { Organization } from "./Organization";

export enum AuditAction {
    CREATE = "create",
    READ = "read",
    UPDATE = "update",
    DELETE = "delete",
    LOGIN = "login",
    LOGOUT = "logout",
    INVITE = "invite",
    ASSIGN = "assign",
    TRANSITION = "transition",
    EXPORT = "export",
    IMPORT = "import",
    PERMISSION_CHANGE = "permission_change"
}

@Entity("audit_logs")
@Index(["organizationId", "createdAt"])
@Index(["userId", "createdAt"])
@Index(["resource", "resourceId"])
export class AuditLog {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "userId" })
    user?: User;

    @Column({ nullable: true })
    @Index()
    userId?: string;

    @Column({
        type: "enum",
        enum: AuditAction
    })
    @Index()
    action!: AuditAction;

    @Column()
    @Index()
    resource!: string; // e.g., "users", "tasks", "workflows"

    @Column({ nullable: true })
    resourceId?: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "jsonb", nullable: true })
    oldValue?: Record<string, any>;

    @Column({ type: "jsonb", nullable: true })
    newValue?: Record<string, any>;

    @Column({ type: "jsonb", nullable: true })
    metadata?: {
        changes?: Array<{
            field: string;
            oldValue: any;
            newValue: any;
        }>;
        context?: Record<string, any>;
    };

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ nullable: true })
    userAgent?: string;

    // Multi-tenant context
    @ManyToOne(() => Organization, { nullable: true, onDelete: "CASCADE" })
    @JoinColumn({ name: "organizationId" })
    organization?: Organization;

    @Column({ nullable: true })
    @Index()
    organizationId?: string;

    @CreateDateColumn()
    @Index()
    createdAt!: Date;
}
