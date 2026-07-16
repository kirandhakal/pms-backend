import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from "typeorm";
import { Meeting } from "./Meeting";
import { User } from "./User";
import { MomActionItem } from "./MomActionItem";

@Entity("minutes_of_meeting")
export class MinutesOfMeeting {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @OneToOne(() => Meeting, (meeting) => meeting.mom, { onDelete: "CASCADE" })
    @JoinColumn({ name: "meetingId" })
    meeting!: Meeting;

    @Column({ unique: true })
    meetingId!: string;

    @Column({ type: "text" })
    summary!: string;

    @Column({ type: "text", nullable: true })
    decisions?: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "generatedById" })
    generatedBy?: User;

    @Column({ nullable: true })
    generatedById?: string;

    @Column({ default: false })
    isAutoDrafted!: boolean;

    @OneToMany(() => MomActionItem, (a) => a.mom, { cascade: true })
    actionItems!: MomActionItem[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
