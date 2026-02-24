"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserService_1 = require("../services/UserService");
const userService = new UserService_1.UserService();
class UserController {
    async getAllUsers(req, res, next) {
        try {
            const users = await userService.getAllUsers();
            res.json(users);
        }
        catch (err) {
            next(err);
        }
    }
    async createAdmin(req, res, next) {
        try {
            const user = await userService.createAdmin(req.body);
            res.status(201).json(user);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.UserController = UserController;
