"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canManageRole = void 0;
const types_1 = require("./types");
const canManageRole = (managerRole, targetRole) => {
    return types_1.RoleLevel.indexOf(managerRole) < types_1.RoleLevel.indexOf(targetRole);
};
exports.canManageRole = canManageRole;
