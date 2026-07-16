import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from "typeorm";
import { User } from "./User";
import { Team } from "./Team";
import { Task } from "./Task";
import { Workflow } from "./Workflow";
import { ProjectMember } from "./ProjectMember";

export enum ProjectStatus {
    PLANNING = "planning",
    ACTIVE = "active",
    COMPLETED = "completed",
    ON_HOLD = "on_hold",
}

@Entity("projects")
export class Project {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ nullable: true })
    color?: string;

    @ManyToOne(() => User, (user) => user.managedProjects)
    @JoinColumn({ name: "managerId" })
    manager!: User;

    @Column()
    managerId!: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "teamLeadId" })
    teamLead?: User;

    @Column({ nullable: true })
    teamLeadId?: string;

    @ManyToOne(() => Team, (team) => team.projects)
    @JoinColumn({ name: "teamId" })
    team!: Team;

    @Column()
    teamId!: string;

    @ManyToOne(() => Workflow, { nullable: true })
    @JoinColumn({ name: "workflowId" })
    workflow?: Workflow;

    @Column({ nullable: true })
    @Index()
    workflowId?: string;

    @Column({ type: "timestamp", nullable: true })
    startDate?: Date;

    @Column({ type: "timestamp", nullable: true })
    endDate?: Date;

    @Column({ type: "enum", enum: ProjectStatus, default: ProjectStatus.ACTIVE })
    status!: ProjectStatus;

    @OneToMany(() => Task, (task) => task.project)
    tasks!: Task[];

    @OneToMany(() => ProjectMember, (member) => member.project)
    members!: ProjectMember[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
