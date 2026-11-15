import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity("chat_attachments")
@Index(["conversationKey", "messageId"])
export class ChatAttachment {
    @PrimaryGeneratedColumn("uuid") id!: string;
    @Column() conversationKey!: string;
    @Column() uploaderId!: string;
    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "uploaderId" }) uploader!: User;
    @Column({ unique: true }) objectKey!: string;
    @Column({ length: 200 }) name!: string;
    @Column() mimeType!: string;
    @Column({ type: "int" }) size!: number;
    @Column({ type: "uuid", nullable: true }) messageId!: string | null;
    @Column({ type: "varchar", default: "pending" }) status!: "pending" | "uploading" | "ready" | "deleted";
    @Column({ type: "timestamptz" }) expiresAt!: Date;
    @CreateDateColumn() createdAt!: Date;
}
