import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { Organization } from "./Organization";
import { Project } from "./Project";
import { Channel } from "./Channel";
import { User } from "./User";
import { MeetingParticipant } from "./MeetingParticipant";
import { MeetingNote } from "./MeetingNote";
import { MinutesOfMeeting } from "./MinutesOfMeeting";

export enum MeetingStatus {
    SCHEDULED = "SCHEDULED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
}

export enum MeetingVisibility {
    PRIVATE = "PRIVATE",
    PUBLIC = "PUBLIC",
}

@Entity("meetings")
export class Meeting {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /** Null for personal/individual meetings */
    @ManyToOne(() => Organization, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "organizationId" })
    organization?: Organization;

    @Column({ nullable: true })
    @Index()
    organizationId?: string;

    @ManyToOne(() => Project, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "projectId" })
    project?: Project;

    @Column({ nullable: true })
    @Index()
    projectId?: string;

    @ManyToOne(() => Channel, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "channelId" })
    channel?: Channel;

    @Column({ nullable: true })
    channelId?: string;

    @Column({ length: 255 })
    title!: string;

    /** Free-form topic for grouping (standup, planning, other…) */
    @Column({ length: 100, nullable: true })
    @Index()
    topic?: string;

    @Column({ type: "text", nullable: true })
    agenda?: string;

    @Column({ type: "timestamptz" })
    scheduledAt!: Date;

    @Column({ type: "int", default: 30 })
    durationMins!: number;

    @Column({ type: "enum", enum: MeetingStatus, default: MeetingStatus.SCHEDULED })
    status!: MeetingStatus;

    @Column({ type: "enum", enum: MeetingVisibility, default: MeetingVisibility.PRIVATE })
    visibility!: MeetingVisibility;

    /** Shareable join token — anyone with link can join if PUBLIC */
    @Column({ unique: true, nullable: true })
    @Index()
    inviteToken?: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "createdById" })
    createdBy!: User;

    @Column()
    @Index()
    createdById!: string;

    @OneToMany(() => MeetingParticipant, (p) => p.meeting, { cascade: true })
    participants!: MeetingParticipant[];

    @OneToMany(() => MeetingNote, (n) => n.meeting, { cascade: true })
    notes!: MeetingNote[];

    @OneToOne(() => MinutesOfMeeting, (m) => m.meeting)
    mom?: MinutesOfMeeting;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
