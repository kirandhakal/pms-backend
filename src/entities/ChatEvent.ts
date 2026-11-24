import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("chat_events")
@Index(["conversationKey", "sequence"])
export class ChatEvent {
    @PrimaryGeneratedColumn("increment", { type: "bigint" }) sequence!: string;
    @Column() conversationKey!: string;
    @Column({ type: "uuid" }) messageId!: string;
}
