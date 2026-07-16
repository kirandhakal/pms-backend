import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { Meeting } from "./Meeting";
import { User } from "./User";

@Entity("meeting_notes")
export class MeetingNote {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Meeting, (meeting) => meeting.notes, { onDelete: "CASCADE" })
    @JoinColumn({ name: "meetingId" })
    meeting!: Meeting;

    @Column()
    @Index()
    meetingId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "authorId" })
    author!: User;

    @Column()
    authorId!: string;

    @Column({ type: "text" })
    content!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
