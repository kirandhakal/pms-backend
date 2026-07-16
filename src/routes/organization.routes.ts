import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { OrganizationController } from "../controllers/OrganizationController";

const router = Router();
const organizationController = new OrganizationController();

router.use(authenticate);

router.post("/", organizationController.create);
router.get("/search", organizationController.search);
router.post("/join", organizationController.join);
router.get("/invites/:token/preview", organizationController.invitePreview);

router.get("/:teamId/members", organizationController.members);
router.get("/:teamId/users/search", organizationController.searchUsers);
router.post("/:teamId/invite", organizationController.invite);
router.post("/:teamId/invite-link", organizationController.createInviteLink);
router.post("/:teamId/members", organizationController.addMember);
router.post("/:teamId/members/add-user", organizationController.addExistingUser);
router.patch("/:teamId/members/:memberId/role", organizationController.updateMemberRole);
router.get("/:teamId/members/:memberId/permissions", organizationController.getMemberPermissions);
router.put("/:teamId/members/:memberId/permissions", organizationController.setMemberPermissions);
router.delete("/:teamId/members/:memberId", organizationController.removeMember);
router.get("/:teamId/activity", organizationController.activity);

export default router;
