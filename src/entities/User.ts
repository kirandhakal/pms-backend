import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Team } from "./Team";
import { Project } from "./Project";
import { Task } from "./Task";
import { OrganizationPermission } from "./OrganizationPermission";

export enum OAuthProvider {
    GOOGLE = "google",
    GITHUB = "github",
    LOCAL = "local"
}

export enum UserRole {
    SUDO_ADMIN = "SUDO_ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    DEPARTMENT_HEAD = "DEPARTMENT_HEAD",
    MANAGER = "MANAGER",
    MEMBER = "MEMBER",
    GUEST = "GUEST"
}

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ unique: true })
    email!: string;

    @Column({ select: false, nullable: true })
    password!: string;

    @Column({
        type: "enum",
        enum: OAuthProvider,
        default: OAuthProvider.LOCAL
    })
    oauthProvider!: OAuthProvider;

    @Column({ nullable: true })
    oauthId!: string;

    @Column({
        type: "varchar",
        default: UserRole.MEMBER
    })
    role!: UserRole;

    @Column({ nullable: true })
    avatarUrl?: string;

    @Column({ nullable: true })
    phone?: string;

    @ManyToOne(() => Team, (team) => team.members, { nullable: true })
    team?: Team;

    @OneToMany(() => Project, (project) => project.manager)
    managedProjects?: Project[];

    @OneToMany(() => Task, (task) => task.assignedUser)
    assignedTasks?: Task[];

    @OneToMany(() => OrganizationPermission, (permission) => permission.user)
    organizationPermissions?: OrganizationPermission[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
