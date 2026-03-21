import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Team } from "./Team";
import { Project } from "./Project";
import { Task } from "./Task";

export enum OAuthProvider {
    GOOGLE = "google",
    GITHUB = "github",
    LOCAL = "local"
}

export enum UserRole {
    SUPER_ADMIN = "SuperAdmin",
    PROJECT_MANAGER = "ProjectManager",
    TEAM_MEMBER = "TeamMember"
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
        type: "enum",
        enum: UserRole,
        default: UserRole.TEAM_MEMBER
    })
    role!: UserRole;

    @ManyToOne(() => Team, (team) => team.members, { nullable: true })
    team?: Team;

    @OneToMany(() => Project, (project) => project.manager)
    managedProjects?: Project[];

    @OneToMany(() => Task, (task) => task.assignedUser)
    assignedTasks?: Task[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
