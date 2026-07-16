import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from "typeorm";
import { Meeting } from "./Meeting";
import { User } from "./User";

@Entity("meeting_participants")
@Unique(["meetingId", "userId"])
export class MeetingParticipant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Meeting, (meeting) => meeting.participants, { onDelete: "CASCADE" })
    @JoinColumn({ name: "meetingId" })
    meeting!: Meeting;

    @Column()
    @Index()
    meetingId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    @Index()
    userId!: string;

    @Column({ default: false })
    isOrganizer!: boolean;

    @Column({ type: "boolean", nullable: true })
    attended?: boolean;
}
