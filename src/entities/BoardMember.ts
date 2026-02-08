import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Board } from "./Board";

@Entity("board_members")
export class BoardMember {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User)
    user!: User;

    @ManyToOne(() => Board, (board) => board.members)
    board!: Board;

    @Column({ default: true })
    canRead!: boolean;

    @Column({ default: false })
    canWrite!: boolean;

    @Column({ default: false })
    canDrag!: boolean;

    @Column({ default: false })
    canManage!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
