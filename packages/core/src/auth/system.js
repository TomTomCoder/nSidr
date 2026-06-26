"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPluginEmail = exports.SYSTEM_USER_ID = void 0;
exports.SYSTEM_USER_ID = 'system';
const getPluginEmail = (pluginId) => `${pluginId.toLowerCase()}@plugin.teable.ai`;
exports.getPluginEmail = getPluginEmail;
