"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonErrorStrategy = void 0;
const antlr4ts_1 = require("antlr4ts");
class JsonErrorStrategy extends antlr4ts_1.DefaultErrorStrategy {
    reportError(parser, _recognitionException) {
        throw new Error(`expression parsing failure, invalid token: '${parser.currentToken.text}'`);
    }
    reportUnwantedToken(recognizer) {
        throw new Error(`unrecognized token: '${recognizer.currentToken.text}'`);
    }
}
exports.JsonErrorStrategy = JsonErrorStrategy;
