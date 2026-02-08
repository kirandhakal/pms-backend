import { AppDataSource } from "../config/data-source";
import { Board, BoardType } from "../entities/Board";
import { Project } from "../entities/Project";
import { BoardMember } from "../entities/BoardMember";
import { User } from "../entities/User";

export class BoardService {
    private boardRepo = AppDataSource.getRepository(Board);
    private projectRepo = AppDataSource.getRepository(Project);
    private boardMemberRepo = AppDataSource.getRepository(BoardMember);

    async createBoard(data: {
        title: string;
        projectId: string;
        color?: string;
        order?: number;
        type?: BoardType;
    }) {
        const project = await this.projectRepo.findOneBy({ id: data.projectId });
        if (!project) throw new Error("Project not found");

        const board = this.boardRepo.create({
            title: data.title,
            color: data.color,
            order: data.order || 0,
            type: data.type || BoardType.KANBAN,
            project
        });

        return await this.boardRepo.save(board);
    }

    async addMember(boardId: string, data: {
        userId: string;
        canRead?: boolean;
        canWrite?: boolean;
        canDrag?: boolean;
        canManage?: boolean;
    }) {
        const board = await this.boardRepo.findOneBy({ id: boardId });
        if (!board) throw new Error("Board not found");

        const member = this.boardMemberRepo.create({
            board,
            user: { id: data.userId } as User,
            canRead: data.canRead ?? true,
            canWrite: data.canWrite ?? false,
            canDrag: data.canDrag ?? false,
            canManage: data.canManage ?? false
        });

        return await this.boardMemberRepo.save(member);
    }

    async getProjectBoards(projectId: string) {
        return await this.boardRepo.find({
            where: { project: { id: projectId } },
            relations: ["tasks", "members", "members.user"],
            order: { order: "ASC" }
        });
    }

    async deleteBoard(id: string) {
        await this.boardRepo.delete(id);
    }
}
