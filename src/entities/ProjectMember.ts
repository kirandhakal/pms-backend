import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
} from "typeorm";
import { Project } from "./Project";
import { User } from "./User";

export enum ProjectMemberRole {
    PROJECT_MANAGER = "PROJECT_MANAGER",
    TEAM_LEAD = "TEAM_LEAD",
    FRONTEND = "FRONTEND",
    BACKEND = "BACKEND",
    TESTER = "TESTER",
    DEVOPS = "DEVOPS",
    MEMBER = "MEMBER",
}

@Entity("project_members")
@Unique(["projectId", "userId"])
export class ProjectMember {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Project, (project) => project.members, { onDelete: "CASCADE" })
    @JoinColumn({ name: "projectId" })
    project!: Project;

    @Column()
    @Index()
    projectId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    @Index()
    userId!: string;

    @Column({ type: "enum", enum: ProjectMemberRole, default: ProjectMemberRole.MEMBER })
    role!: ProjectMemberRole;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
