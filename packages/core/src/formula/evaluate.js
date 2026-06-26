"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = void 0;
const formula_1 = require("@teable/formula");
const antlr4ts_1 = require("antlr4ts");
const visitor_1 = require("./visitor");
const evaluate = (input, dependFieldMap, record, timeZone) => {
    const inputStream = antlr4ts_1.CharStreams.fromString(input);
    const lexer = new formula_1.FormulaLexer(inputStream);
    const tokenStream = new antlr4ts_1.CommonTokenStream(lexer);
    const parser = new formula_1.Formula(tokenStream);
    parser.removeErrorListeners();
    const errorListener = new formula_1.FormulaErrorListener();
    parser.addErrorListener(errorListener);
    const tree = parser.root();
    const visitor = new visitor_1.EvalVisitor(dependFieldMap, record, timeZone);
    return visitor.visit(tree);
};
exports.evaluate = evaluate;
