import { AbstractParseTreeVisitor } from 'antlr4ts/tree';
import type { BinaryExprContext, BooleanLiteralContext, FieldIdentifierContext, NullLiteralContext, NumberLiteralContext, ParenQueryExprContext, PredicateExprEqArrayContext, PredicateExprHasContext, PredicateExprInContext, PredicateExprLikeContext, PrimaryExprCompareContext, PrimaryExprIsContext, PrimaryExprPredicateContext, QueryExprContext, StartContext, StringLiteralContext, ValueContext } from './parser/Query';
import { ValueListContext } from './parser/Query';
import type { QueryVisitor } from './parser/QueryVisitor';
export declare class JsonVisitor extends AbstractParseTreeVisitor<any> implements QueryVisitor<any> {
    defaultResult(): null;
    visitStart(ctx: StartContext): any;
    visitQueryExpr(ctx: QueryExprContext): any;
    visitParenQueryExpr(ctx: ParenQueryExprContext): any;
    visitBinaryExpr(ctx: BinaryExprContext): any;
    visitFieldIdentifier(ctx: FieldIdentifierContext): any;
    visitPrimaryExprPredicate(ctx: PrimaryExprPredicateContext): any;
    visitPrimaryExprIs(ctx: PrimaryExprIsContext): any;
    visitPrimaryExprCompare(ctx: PrimaryExprCompareContext): any;
    visitPredicateExprLike(ctx: PredicateExprLikeContext): any;
    visitPredicateExprIn(ctx: PredicateExprInContext): any;
    visitPredicateExprHas(ctx: PredicateExprHasContext): any;
    visitPredicateExprEqArray(ctx: PredicateExprEqArrayContext): any;
    visitValue(ctx: ValueContext): any;
    visitValueList(ctx: ValueListContext): any;
    visitStringLiteral(ctx: StringLiteralContext): any;
    visitNumberLiteral(ctx: NumberLiteralContext): any;
    visitBooleanLiteral(ctx: BooleanLiteralContext): any;
    visitNullLiteral(_ctx: NullLiteralContext): any;
    private createResult;
}
export declare const parseTQL: (input: string) => any;
