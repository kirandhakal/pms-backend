"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const data_source_1 = require("../config/data-source");
const auth_1 = require("../middlewares/auth");
const UserOrganization_1 = require("../entities/UserOrganization");
const router = (0, express_1.Router)();
const userOrganizationRepo = data_source_1.AppDataSource.getRepository(UserOrganization_1.UserOrganization);
router.use(auth_1.authenticate);
router.get("/me/organizations", async (req, res) => {
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
        res.json(organizations.map((membership) => ({
            id: membership.organizationId,
            name: membership.organization?.name ?? "",
            slug: membership.organization?.slug ?? "",
            role: membership.role,
            joinedAt: membership.joinedAt
        })));
    }
    catch (error) {
        res.status(500).json({ message: error?.message ?? "Failed to fetch organizations" });
    }
});
exports.default = router;
