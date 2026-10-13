"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const units_controller_1 = require("../controllers/units.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', units_controller_1.getUnits);
router.get('/:id', units_controller_1.getUnit);
router.post('/', (0, auth_middleware_1.authorize)('ADMIN'), units_controller_1.createUnit);
router.put('/:id', (0, auth_middleware_1.authorize)('ADMIN'), units_controller_1.updateUnit);
router.patch('/:id/toggle-active', (0, auth_middleware_1.authorize)('ADMIN'), units_controller_1.toggleUnitActive);
router.delete('/:id', (0, auth_middleware_1.authorize)('ADMIN'), units_controller_1.deleteUnit);
exports.default = router;
//# sourceMappingURL=units.routes.js.map