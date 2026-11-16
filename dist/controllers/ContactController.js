"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const data_source_1 = require("../config/data-source");
const ContactSubmission_1 = require("../entities/ContactSubmission");
const repo = () => data_source_1.AppDataSource.getRepository(ContactSubmission_1.ContactSubmission);
class ContactController {
    async create(req, res, next) {
        try {
            const { name, email, subject, message } = req.body;
            if (![name, email, subject, message].every((value) => typeof value === "string" && value.trim()))
                return res.status(400).json({ message: "All contact fields are required." });
            if (!/^\S+@\S+\.\S+$/.test(email))
                return res.status(400).json({ message: "Enter a valid email address." });
            const submission = repo().create({ name: name.trim().slice(0, 120), email: email.trim().toLowerCase().slice(0, 180), subject: subject.trim().slice(0, 160), message: message.trim().slice(0, 5000) });
            await repo().save(submission);
            return res.status(201).json({ message: "Thanks — your message has been received." });
        }
        catch (error) {
            next(error);
        }
    }
    async list(_req, res, next) {
        try {
            return res.json(await repo().find({ order: { createdAt: "DESC" } }));
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const status = req.body.status;
            if (!Object.values(ContactSubmission_1.ContactStatus).includes(status))
                return res.status(400).json({ message: "Invalid status." });
            const submission = await repo().findOneBy({ id: req.params.id });
            if (!submission)
                return res.status(404).json({ message: "Submission not found." });
            submission.status = status;
            return res.json(await repo().save(submission));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ContactController = ContactController;
