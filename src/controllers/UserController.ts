import { NextFunction, Request, Response } from "express";
import { UserService } from "../services/UserService";

const userService = new UserService();

export class UserController {
    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        } catch (err) {
            next(err);
        }
    }

    async createAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await userService.createAdmin(req.body);
            res.status(201).json(user);
        } catch (err) {
            next(err);
        }
    }
}
