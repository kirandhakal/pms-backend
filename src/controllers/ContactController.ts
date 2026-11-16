import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/data-source";
import { ContactStatus, ContactSubmission } from "../entities/ContactSubmission";

const repo = () => AppDataSource.getRepository(ContactSubmission);

export class ContactController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, subject, message } = req.body;
      if (![name, email, subject, message].every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ message: "All contact fields are required." });
      if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
      const submission = repo().create({ name: name.trim().slice(0, 120), email: email.trim().toLowerCase().slice(0, 180), subject: subject.trim().slice(0, 160), message: message.trim().slice(0, 5000) });
      await repo().save(submission);
      return res.status(201).json({ message: "Thanks — your message has been received." });
    } catch (error) { next(error); }
  }

  async list(_req: Request, res: Response, next: NextFunction) {
    try { return res.json(await repo().find({ order: { createdAt: "DESC" } })); } catch (error) { next(error); }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.body.status as ContactStatus;
      if (!Object.values(ContactStatus).includes(status)) return res.status(400).json({ message: "Invalid status." });
      const submission = await repo().findOneBy({ id: req.params.id as string });
      if (!submission) return res.status(404).json({ message: "Submission not found." });
      submission.status = status;
      return res.json(await repo().save(submission));
    } catch (error) { next(error); }
  }
}
