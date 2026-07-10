import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
} from "typeorm";
import { Channel } from "./Channel";
import { User } from "./User";

@Entity("channel_members")
@Unique(["channelId", "userId"])
export class ChannelMember {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Channel, (channel) => channel.members, { onDelete: "CASCADE" })
    @JoinColumn({ name: "channelId" })
    channel!: Channel;

    @Column()
    @Index()
    channelId!: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "userId" })
    user!: User;

    @Column()
    @Index()
    userId!: string;

    @Column({ default: false })
    isMuted!: boolean;

    @CreateDateColumn()
    joinedAt!: Date;
}
