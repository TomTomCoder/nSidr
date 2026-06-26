"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTQL = exports.JsonVisitor = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const antlr4ts_1 = require("antlr4ts");
const tree_1 = require("antlr4ts/tree");
const json_error_strategy_1 = require("./json-error.strategy");
const Query_1 = require("./parser/Query");
const QueryLexer_1 = require("./parser/QueryLexer");
class JsonVisitor extends tree_1.AbstractParseTreeVisitor {
    defaultResult() {
        return null;
    }
    visitStart(ctx) {
        let result = this.visit(ctx.expr());
        if (!result) {
            return this.defaultResult();
        }
        // If the result does not contain the filterSet and conjunction properties, then we need to create a new object
        if (!result.filterSet) {
            result = {
                filterSet: [result],
                conjunction: 'and',
            };
        }
        return result;
    }
    visitQueryExpr(ctx) {
        return this.visit(ctx.queryStatement());
    }
    visitParenQueryExpr(ctx) {
        return this.visit(ctx.expr());
    }
    visitBinaryExpr(ctx) {
        const operator = ctx?._op?.text?.toLowerCase();
        const expressions = ctx.expr();
        let leftExpr = this.visit(expressions[0]);
        const rightExpr = this.visit(expressions[1]);
        // If the expression is not a filter set, we convert it to a filter set
        if (!leftExpr.conjunction) {
            leftExpr = {
                filterSet: [leftExpr],
                conjunction: operator,
            };
        }
        // If the operator of the current left-hand expression is not the same as the given operator
        if (leftExpr.conjunction !== operator) {
            // If inconsistent, create a new object that contains a filter set with the left and right expressions
            // and set the concatenation of the new object to the given operator
            leftExpr = {
                filterSet: [leftExpr, rightExpr],
                conjunction: operator,
            };
        }
        else if (leftExpr.conjunction === rightExpr.conjunction) {
            leftExpr.filterSet.push(...rightExpr.filterSet);
        }
        else {
            leftExpr.filterSet.push(rightExpr);
        }
        return leftExpr;
    }
    visitFieldIdentifier(ctx) {
        return ctx.text.replace(/[{}]/g, '');
    }
    visitPrimaryExprPredicate(ctx) {
        return this.visit(ctx.predicate());
    }
    visitPrimaryExprIs(ctx) {
        return this.createResult(ctx.fieldIdentifier(), ctx.isOp().text);
    }
    visitPrimaryExprCompare(ctx) {
        return this.createResult(ctx.fieldIdentifier(), ctx.compOp().text, ctx.value());
    }
    visitPredicateExprLike(ctx) {
        return this.createResult(ctx.fieldIdentifier(), ctx.likeOp().text, ctx.value());
    }
    visitPredicateExprIn(ctx) {
        return this.createResult(ctx.fieldIdentifier(), ctx.inOp().text, ctx.valueList());
    }
    visitPredicateExprHas(ctx) {
        return this.createResult(ctx.fieldIdentifier(), ctx.HAS_SYMBOL().text, ctx.valueList());
    }
    visitPredicateExprEqArray(ctx) {
        return this.createResult(ctx.fieldIdentifier(), ctx.EQUAL_OPERATOR().text, ctx.valueList());
    }
    visitValue(ctx) {
        return this.visit(ctx.literal());
    }
    visitValueList(ctx) {
        return ctx.literal().map((value) => this.visit(value));
    }
    visitStringLiteral(ctx) {
        return ctx.text.slice(1, -1);
    }
    visitNumberLiteral(ctx) {
        return Number(ctx.text);
    }
    visitBooleanLiteral(ctx) {
        return ctx.text.toUpperCase() === 'TRUE';
    }
    visitNullLiteral(_ctx) {
        return null;
    }
    createResult(fieldCtx, operatorCtx, valueCtx) {
        const fieldId = this.visit(fieldCtx);
        const operator = operatorCtx.toUpperCase() === '<>' ? '!=' : operatorCtx.toUpperCase();
        let value = null;
        if (valueCtx) {
            if (valueCtx instanceof Query_1.ValueListContext) {
                value = this.visitValueList(valueCtx);
            }
            else {
                value = this.visitValue(valueCtx);
            }
        }
        return {
            isSymbol: true,
            fieldId: fieldId,
            operator: operator,
            value: value,
        };
    }
}
exports.JsonVisitor = JsonVisitor;
// parse Teable Query Language
const parseTQL = (input) => {
    const inputStream = antlr4ts_1.CharStreams.fromString(input);
    const lexer = new QueryLexer_1.QueryLexer(inputStream);
    const tokenStream = new antlr4ts_1.CommonTokenStream(lexer);
    const parser = new Query_1.Query(tokenStream);
    parser.errorHandler = new json_error_strategy_1.JsonErrorStrategy();
    const tree = parser.start();
    const visitor = new JsonVisitor();
    return visitor.visit(tree);
};
exports.parseTQL = parseTQL;
