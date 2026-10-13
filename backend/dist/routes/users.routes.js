"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN'));
router.get('/', users_controller_1.getUsers);
router.post('/', users_controller_1.createUser);
router.put('/:id', users_controller_1.updateUser);
router.patch('/:id/toggle-active', users_controller_1.toggleUserActive);
router.patch('/:id/reset-password', users_controller_1.resetPassword);
exports.default = router;
//# sourceMappingURL=users.routes.js.map