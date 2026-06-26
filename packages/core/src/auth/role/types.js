"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleSchema = exports.BillableRoles = exports.RoleLevel = exports.Role = void 0;
const zod_1 = require("../../zod");
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.Role = {
    Owner: 'owner',
    Creator: 'creator',
    Editor: 'editor',
    Commenter: 'commenter',
    Viewer: 'viewer',
};
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.RoleLevel = ['owner', 'creator', 'editor', 'commenter', 'viewer'];
// Billable roles are roles that count towards seat-based billing
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.BillableRoles = [exports.Role.Owner, exports.Role.Creator, exports.Role.Editor];
exports.roleSchema = zod_1.z.enum(exports.Role);
