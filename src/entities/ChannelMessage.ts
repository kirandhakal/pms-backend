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
import { Channel } from "./Channel";
import { User } from "./User";

@Entity("channel_messages")
export class ChannelMessage {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Channel, (channel) => channel.messages, { onDelete: "CASCADE" })
    @JoinColumn({ name: "channelId" })
    channel!: Channel;

    @Column()
    @Index()
    channelId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    userId!: string;

    @Column({ type: "text" })
    body!: string;

    @Column({ default: false })
    isDeleted!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
