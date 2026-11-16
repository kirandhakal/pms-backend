import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./User";
@Entity("notifications")
@Index(["userId", "createdAt"])
export class Notification {
 @PrimaryGeneratedColumn("uuid") id!: string;
 @Column("uuid") userId!: string;
 @ManyToOne(() => User, { onDelete: "CASCADE" }) @JoinColumn({ name: "userId" }) user!: User;
 @Column() type!: string;
 @Column() title!: string;
 @Column("text") body!: string;
 @Column({ type: "timestamptz", nullable: true }) readAt!: Date | null;
 @CreateDateColumn() createdAt!: Date;
}
