import { AppDataSource } from "../config/data-source";
import { Board } from "../entities/Board";
import { Project } from "../entities/Project";

export class BoardService {
    private boardRepo = AppDataSource.getRepository(Board);
    private projectRepo = AppDataSource.getRepository(Project);

    async createBoard(data: { title: string; projectId: string; color?: string; order?: number }) {
        const project = await this.projectRepo.findOneBy({ id: data.projectId });
        if (!project) throw new Error("Project not found");

        const board = this.boardRepo.create({
            title: data.title,
            color: data.color,
            order: data.order || 0,
            project
        });

        return await this.boardRepo.save(board);
    }

    async getProjectBoards(projectId: string) {
        return await this.boardRepo.find({
            where: { project: { id: projectId } },
            relations: ["tasks"],
            order: { order: "ASC" }
        });
    }

    async deleteBoard(id: string) {
        await this.boardRepo.delete(id);
    }
}
