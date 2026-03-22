import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity("password_reset_otps")
export class PasswordResetOtp {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
    user!: User;

    @Column({ select: false })
    otpHash!: string;

    @Column({ type: "timestamp" })
    expiresAt!: Date;

    @Column({ default: 0 })
    attempts!: number;

    @Column({ default: false })
    used!: boolean;

    @CreateDateColumn()
    createdAt!: Date;
}
