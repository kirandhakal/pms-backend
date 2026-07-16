import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from "typeorm";
import { User } from "./User";
import { Team } from "./Team";
import { ChannelMessage } from "./ChannelMessage";
import { ChannelMember } from "./ChannelMember";

export enum ChannelType {
    PUBLIC = "public",
    PRIVATE = "private",
}

@Entity("channels")
export class Channel {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    @Index()
    name!: string;

    @Column({ type: "text", nullable: true })
    description?: string;

    @Column({ type: "enum", enum: ChannelType, default: ChannelType.PUBLIC })
    type!: ChannelType;

    @ManyToOne(() => Team, { onDelete: "CASCADE" })
    @JoinColumn({ name: "teamId" })
    team!: Team;

    @Column()
    @Index()
    teamId!: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "createdById" })
    createdBy?: User;

    @Column({ nullable: true })
    createdById?: string;

    @OneToMany(() => ChannelMessage, (message) => message.channel)
    messages!: ChannelMessage[];

    @OneToMany(() => ChannelMember, (member) => member.channel)
    members!: ChannelMember[];

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
