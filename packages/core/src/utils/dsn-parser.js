"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isParsableDsn = exports.parseDsn = exports.DriverClient = void 0;
const dsn_parser_1 = require("@httpx/dsn-parser");
var DriverClient;
(function (DriverClient) {
    DriverClient["Pg"] = "postgresql";
})(DriverClient || (exports.DriverClient = DriverClient = {}));
function parseDsn(dsn) {
    const parsedDsn = (0, dsn_parser_1.parseDsn)(dsn);
    if (!parsedDsn.success) {
        throw new Error(`DATABASE_URL ${parsedDsn.reason}`);
    }
    if (!parsedDsn.value.port) {
        throw new Error(`DATABASE_URL must provide a port`);
    }
    if (parsedDsn.value.driver !== DriverClient.Pg) {
        throw new Error(`DATABASE_URL driver ${parsedDsn.value.driver} is not supported`);
    }
    return parsedDsn.value;
}
exports.parseDsn = parseDsn;
function isParsableDsn(dsn) {
    if (typeof dsn !== 'string') {
        return false;
    }
    try {
        parseDsn(dsn);
        return true;
    }
    catch {
        return false;
    }
}
exports.isParsableDsn = isParsableDsn;
