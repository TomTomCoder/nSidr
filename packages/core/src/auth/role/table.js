"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableRolesSchema = exports.TableRole = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const zod_1 = require("../../zod");
const types_1 = require("./types");
exports.TableRole = {
    Creator: types_1.Role.Creator,
    Editor: types_1.Role.Editor,
    Viewer: types_1.Role.Viewer,
};
exports.tableRolesSchema = zod_1.z.enum(exports.TableRole);
