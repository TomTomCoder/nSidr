"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRestrictedRole = exports.hasPermission = exports.getPermissionMap = exports.getPermissions = exports.checkPermissions = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
/**
 * TODO: need to distinguish between the resources that this role targets, such as spaceRole or baseRole
 */
const lodash_1 = require("lodash");
const role_1 = require("./role");
const checkPermissions = (role, actions) => {
    return actions.every((action) => Boolean(role_1.RolePermission[role][action]));
};
exports.checkPermissions = checkPermissions;
const getPermissions = (role) => {
    const permissionMap = (0, exports.getPermissionMap)(role);
    return (0, lodash_1.keys)(permissionMap).filter((key) => permissionMap[key]);
};
exports.getPermissions = getPermissions;
const getPermissionMap = (role) => {
    return role_1.RolePermission[role];
};
exports.getPermissionMap = getPermissionMap;
const hasPermission = (role, action) => {
    return (0, exports.checkPermissions)(role, [action]);
};
exports.hasPermission = hasPermission;
const isRestrictedRole = (role) => {
    return role !== role_1.Role.Owner;
};
exports.isRestrictedRole = isRestrictedRole;
