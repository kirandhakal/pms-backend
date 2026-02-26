import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from "typeorm";
import { Team } from "./Team";
import { Project } from "./Project";
import { Task } from "./Task";

export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN",
    SUPER_ADMIN = "SUPER_ADMIN",
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
    email!: string;

    @Column({ select: false })
    password!: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER
    })
    role!: UserRole;

    @Column({ default: true })
    isActive!: boolean;

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
