import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { Meeting } from "./Meeting";
import { User } from "./User";

@Entity("meeting_participants")
export class MeetingParticipant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Meeting, (meeting) => meeting.participants, { onDelete: "CASCADE" })
    @JoinColumn({ name: "meetingId" })
    meeting!: Meeting;

    @Column()
    @Index()
    meetingId!: string;

    /** Null when guest joins without an account */
    @ManyToOne(() => User, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "userId" })
    user?: User;

    @Column({ nullable: true })
    @Index()
    userId?: string;

    @Column({ length: 120, nullable: true })
    guestName?: string;

    @Column({ length: 255, nullable: true })
    guestEmail?: string;

    @Column({ default: false })
    isOrganizer!: boolean;

    @Column({ type: "boolean", nullable: true })
    attended?: boolean;
}
