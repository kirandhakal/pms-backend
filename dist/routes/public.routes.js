"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PublicController_1 = require("../controllers/PublicController");
const router = (0, express_1.Router)();
const publicController = new PublicController_1.PublicController();
router.get("/stats", publicController.getStats);
router.get("/features", publicController.getFeatures);
exports.default = router;
