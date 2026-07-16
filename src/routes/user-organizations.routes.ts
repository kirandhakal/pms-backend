import { Router } from "express";
import { AppDataSource } from "../config/data-source";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { UserOrganization } from "../entities/UserOrganization";

const router = Router();
const userOrganizationRepo = AppDataSource.getRepository(UserOrganization);

router.use(authenticate);

router.get("/me/organizations", async (req: AuthRequest, res) => {
    try {
        if (!req.user?.id) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const organizations = await userOrganizationRepo.find({
            where: { userId: req.user.id },
            relations: ["organization"],
            order: { joinedAt: "DESC" }
        });

        res.json(
            organizations.map((membership) => ({
                id: membership.organizationId,
                name: membership.organization?.name ?? "",
                slug: membership.organization?.slug ?? "",
                role: membership.role,
                joinedAt: membership.joinedAt
            }))
        );
    } catch (error: any) {
        res.status(500).json({ message: error?.message ?? "Failed to fetch organizations" });
    }
});

export default router;
