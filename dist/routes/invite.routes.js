"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const InviteController_1 = require("../controllers/InviteController");
const auth_1 = require("../middlewares/auth");
const User_1 = require("../entities/User");
const validate_1 = require("../middlewares/validate");
const invite_schemas_1 = require("../validations/invite.schemas");
const router = (0, express_1.Router)();
const inviteController = new InviteController_1.InviteController();
// Send invitation (admin only)
router.post("/", auth_1.authenticate, (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), (0, validate_1.validateBody)(invite_schemas_1.inviteSchema), inviteController.invite);
// List all invitations (admin only)
router.get("/", auth_1.authenticate, (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN), inviteController.list);
// Public: validate invitation token (used on registration page)
router.get("/validate/:token", inviteController.validate);
exports.default = router;
