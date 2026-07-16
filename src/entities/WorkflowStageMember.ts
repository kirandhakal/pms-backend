import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from "typeorm";
import { WorkflowStage } from "./WorkflowStage";
import { User } from "./User";

@Entity("workflow_stage_members")
@Unique(["stageId", "userId"])
export class WorkflowStageMember {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => WorkflowStage, (stage) => stage.stageMembers, { onDelete: "CASCADE" })
    @JoinColumn({ name: "stageId" })
    stage!: WorkflowStage;

    @Column()
    @Index()
    stageId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    @Index()
    userId!: string;
}
