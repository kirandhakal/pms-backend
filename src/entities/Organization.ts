import { 
    Entity, 
    PrimaryGeneratedColumn, 
    Column, 
    CreateDateColumn, 
    UpdateDateColumn, 
    OneToMany,
    Index
} from "typeorm";
import { Department } from "./Department";
import { User } from "./User";
import { Workflow } from "./Workflow";
import { Role } from "./Role";
import { Invitation } from "./Invitation";

export interface OrganizationSettings {
    branding?: {
        logo?: string;
        primaryColor?: string;
        companyName?: string;
    };
    features?: {
        guestAccess?: boolean;
        departmentVisibility?: boolean;
        auditLogging?: boolean;
    };
    limits?: {
        maxUsers?: number;
        maxDepartments?: number;
        maxWorkflows?: number;
    };
}

@Entity("organizations")
export class Organization {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ unique: true })
    @Index()
    slug!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "jsonb", nullable: true })
    settings?: OrganizationSettings;

    @Column({ default: true })
    isActive!: boolean;

    @Column({ nullable: true })
    ownerId?: string;

    @OneToMany(() => Department, (department: Department) => department.organization)
    departments!: Department[];

    @OneToMany(() => User, (user) => user.organization)
    users!: User[];

    @OneToMany(() => Workflow, (workflow: Workflow) => workflow.organization)
    workflows!: Workflow[];

    @OneToMany(() => Role, (role: Role) => role.organization)
    roles!: Role[];

    @OneToMany(() => Invitation, (invitation) => invitation.organization)
    invitations!: Invitation[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
