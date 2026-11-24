import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { Project } from "./Project";
import { User } from "./User";
@Entity("project_messages")
@Index(["projectId", "userId", "clientMessageId"], { unique: true })
export class ProjectMessage {
    @Column({ type: "bigint", default: "0" })
    chatVersion!: string;

    @Column({ type: "uuid", nullable: true })
    replyToMessageId?: string | null;

    @Column({ type: "timestamptz", nullable: true })
    pinnedAt?: Date | null;

    @Column({ type: "uuid", nullable: true })
    pinnedById?: string | null;

    @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
    chatUpdatedAt!: Date;

 @PrimaryGeneratedColumn("uuid") id!: string;
 @Column() projectId!: string;
 @ManyToOne(() => Project, { onDelete: "CASCADE" }) @JoinColumn({name:"projectId"}) project!: Project;
 @Column() userId!: string;
 @ManyToOne(() => User, { onDelete: "CASCADE" }) @JoinColumn({name:"userId"}) user!: User;
 @Column({type:"uuid"}) clientMessageId!: string;
 @Column({type:"bigint", generated:"increment"}) chatSequence!: string;
 @Column({type:"text"}) body!: string;
 @Column({default:false}) isDeleted!: boolean;
 @CreateDateColumn() createdAt!: Date;
}
