"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fiscal_years_controller_1 = require("../controllers/fiscal-years.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', fiscal_years_controller_1.getFiscalYears);
router.get('/active', fiscal_years_controller_1.getActiveFiscalYear);
router.post('/', (0, auth_middleware_1.authorize)('ADMIN'), fiscal_years_controller_1.createFiscalYear);
router.put('/:id', (0, auth_middleware_1.authorize)('ADMIN'), fiscal_years_controller_1.updateFiscalYear);
router.patch('/:id/set-active', (0, auth_middleware_1.authorize)('ADMIN'), fiscal_years_controller_1.setActiveFiscalYear);
router.delete('/:id', (0, auth_middleware_1.authorize)('ADMIN'), fiscal_years_controller_1.deleteFiscalYear);
exports.default = router;
//# sourceMappingURL=fiscal-years.routes.js.map