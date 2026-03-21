import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { OrganizationController } from "../controllers/OrganizationController";

const router = Router();
const organizationController = new OrganizationController();

router.use(authenticate);

router.post("/", organizationController.create);
router.get("/search", organizationController.search);
router.post("/join", organizationController.join);

router.get("/:teamId/members", organizationController.members);
router.post("/:teamId/invite", organizationController.invite);
router.post("/:teamId/members", organizationController.addMember);
router.patch("/:teamId/members/:memberId/role", organizationController.updateMemberRole);
router.delete("/:teamId/members/:memberId", organizationController.removeMember);
router.get("/:teamId/activity", organizationController.activity);

export default router;
