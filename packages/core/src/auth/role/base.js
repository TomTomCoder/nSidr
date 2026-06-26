"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBasePermission = exports.baseRolesSchema = exports.BaseRole = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const lodash_1 = require("lodash");
const zod_1 = require("../../zod");
const constant_1 = require("./constant");
const types_1 = require("./types");
exports.BaseRole = {
    Creator: types_1.Role.Creator,
    Editor: types_1.Role.Editor,
    Commenter: types_1.Role.Commenter,
    Viewer: types_1.Role.Viewer,
};
exports.baseRolesSchema = zod_1.z.enum(exports.BaseRole);
const getBasePermission = (role) => {
    return (0, lodash_1.omit)(constant_1.RolePermission[role], ['space|create', 'space|delete', 'space|read']);
};
exports.getBasePermission = getBasePermission;
