import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from "typeorm";
import { Organization } from "./Organization";
import { Department } from "./Department";
import { Role } from "./Role";
import { Project } from "./Project";
import { Task } from "./Task";

/**
 * Legacy UserRole enum - kept for backwards compatibility
 * New system uses Role entity with dynamic permissions
 */
export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN",
    SUDO_ADMIN = "SUDO_ADMIN",
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
    MANAGER = "MANAGER",
    MEMBER = "MEMBER",
    GUEST = "GUEST",
    // Legacy roles
    TEAM_MEMBER = "TeamMember",
    PROJECT_MANAGER = "ProjectManager",
    TEAM_LEAD = "TeamLead"
}

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ name: "name" })
    fullName!: string;

    @Column({ unique: true })
    @Index()
    email!: string;

    @Column({ select: false })
    password!: string;

    // Legacy role enum - kept for backwards compatibility
    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER
    })
    legacyRole!: UserRole;

    // New role system with dynamic permissions
    @ManyToOne(() => Role, (role) => role.users, { nullable: true })
    @JoinColumn({ name: "roleId" })
    role?: Role;

    @Column({ nullable: true })
    @Index()
    roleId?: string;

    // Organization (multi-tenant)
    @ManyToOne(() => Organization, (organization) => organization.users, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "organizationId" })
    organization?: Organization;

    @Column({ nullable: true })
    @Index()
    organizationId?: string;

    // Department
    @ManyToOne(() => Department, (department) => department.members, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "departmentId" })
    department?: Department;

    @Column({ nullable: true })
    @Index()
    departmentId?: string;

    @Column({ default: true })
    isActive!: boolean;

    @Column({ type: "timestamp", nullable: true })
    lastLoginAt?: Date;

    @Column({ nullable: true })
    avatarUrl?: string;

    @Column({ type: "jsonb", nullable: true })
    preferences?: {
        theme?: "light" | "dark" | "system";
        notifications?: boolean;
        language?: string;
    };

    // Legacy team relationship
    @ManyToOne("Team", "members", { nullable: true })
    team?: any;

    @OneToMany(() => Project, (project) => project.manager)
    managedProjects?: Project[];

    @OneToMany(() => Task, (task) => task.assignedUser)
    assignedTasks?: Task[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
