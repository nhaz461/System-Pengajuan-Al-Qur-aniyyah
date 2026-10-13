"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activities_controller_1 = require("../controllers/activities.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', activities_controller_1.getActivities);
router.get('/:id', activities_controller_1.getActivity);
router.post('/', (0, auth_middleware_1.authorize)('ADMIN'), activities_controller_1.createActivity);
router.put('/:id', (0, auth_middleware_1.authorize)('ADMIN'), activities_controller_1.updateActivity);
router.patch('/:id/toggle-active', (0, auth_middleware_1.authorize)('ADMIN'), activities_controller_1.toggleActivityActive);
router.delete('/:id', (0, auth_middleware_1.authorize)('ADMIN'), activities_controller_1.deleteActivity);
exports.default = router;
//# sourceMappingURL=activities.routes.js.map