import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { BoardService } from "../services/BoardService";

const boardService = new BoardService();

export class BoardController {
    async create(req: AuthRequest, res: Response) {
        try {
            const board = await boardService.createBoard(req.body);
            res.status(201).json(board);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getByProject(req: AuthRequest, res: Response) {
        try {
            const boards = await boardService.getProjectBoards(req.params.projectId as string);
            res.json(boards);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async delete(req: AuthRequest, res: Response) {
        try {
            await boardService.deleteBoard(req.params.id as string);
            res.status(204).send();
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }
}
