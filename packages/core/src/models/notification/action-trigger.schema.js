"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionTriggerBufferSchema = exports.viewActionKeys = exports.tableActionKeys = void 0;
const zod_1 = require("zod");
exports.tableActionKeys = zod_1.z.enum([
    'addRecord',
    'setRecord',
    'deleteRecord',
    'addField',
    'setField',
    'deleteField',
    'taskProcessing',
    'taskCompleted',
    'taskCancelled',
    'taskFailed',
]);
exports.viewActionKeys = zod_1.z.enum([
    'applyViewFilter',
    'applyViewGroup',
    'applyViewStatisticFunc',
    'showViewField',
]);
exports.actionTriggerBufferSchema = exports.tableActionKeys;
