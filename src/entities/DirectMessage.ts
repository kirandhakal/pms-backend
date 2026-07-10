import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from "typeorm";
import { User } from "./User";

@Entity("direct_messages")
export class DirectMessage {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "senderId" })
    sender!: User;

    @Column()
    @Index()
    senderId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "recipientId" })
    recipient!: User;

    @Column()
    @Index()
    recipientId!: string;

    @Column({ type: "text" })
    body!: string;

    @Column({ default: false })
    isRead!: boolean;

    @Column({ default: false })
    senderMuted!: boolean;

    @Column({ default: false })
    recipientMuted!: boolean;

    @Column({ default: false })
    isDeleted!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
