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
import { User } from "./User";

export enum FriendshipStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    BLOCKED = "blocked",
}

@Entity("friendships")
@Unique(["requesterId", "addresseeId"])
export class Friendship {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "requesterId" })
    requester!: User;

    @Column()
    @Index()
    requesterId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "addresseeId" })
    addressee!: User;

    @Column()
    @Index()
    addresseeId!: string;

    @Column({ type: "enum", enum: FriendshipStatus, default: FriendshipStatus.PENDING })
    status!: FriendshipStatus;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
