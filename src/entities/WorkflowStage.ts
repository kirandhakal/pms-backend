import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index
} from "typeorm";
import { Workflow } from "./Workflow";
import { Task } from "./Task";
import { WorkflowStageMember } from "./WorkflowStageMember";

export enum StageVisibility {
    TEAM_ONLY = "TEAM_ONLY",
    PROJECT_WIDE = "PROJECT_WIDE",
}

export interface StageSettings {
    autoAssignTo?: string;
    requireApproval?: boolean;
    approverRoles?: string[];
    maxWipLimit?: number;
    slaHours?: number;
    notifyOnEntry?: boolean;
    notifyOnExit?: boolean;
    webhookUrl?: string;
    category?: string;
    assignedRole?: string;
    visibleToRoles?: string[];
}

@Entity("workflow_stages")
export class WorkflowStage {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @ManyToOne(() => Workflow, (workflow) => workflow.stages, { onDelete: "CASCADE" })
    @JoinColumn({ name: "workflowId" })
    workflow!: Workflow;

    @Column()
    @Index()
    workflowId!: string;

    @Column({ type: "int", default: 0 })
    order!: number;

    @Column({ default: "#6b7280" }) // Default gray color
    color!: string;

    @Column({ nullable: true })
    icon?: string;

    @Column({ default: false })
    isDefault!: boolean; // Is this the default starting stage?

    @Column({ default: false })
    isFinal!: boolean; // Is this a completion stage?

    @OneToMany(() => Task, (task) => task.stage)
    tasks!: Task[];

    @Column({ type: "jsonb", nullable: true })
    settings?: StageSettings;

    @Column({ type: "enum", enum: StageVisibility, default: StageVisibility.PROJECT_WIDE })
    visibility!: StageVisibility;

    @OneToMany(() => WorkflowStageMember, (m) => m.stage, { cascade: true })
    stageMembers!: WorkflowStageMember[];

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
