import type { BinaryOpContext, BooleanLiteralContext, BracketsContext, DecimalLiteralContext, FieldReferenceCurlyContext, FunctionCallContext, IntegerLiteralContext, LeftWhitespaceOrCommentsContext, RightWhitespaceOrCommentsContext, RootContext, StringLiteralContext, UnaryOpContext, FormulaVisitor } from '@teable/formula';
import { AbstractParseTreeVisitor } from 'antlr4ts/tree/AbstractParseTreeVisitor';
import type { FieldCore } from '../models/field/field';
import { TypedValue } from './typed-value';
export declare class EvalVisitor extends AbstractParseTreeVisitor<TypedValue> implements FormulaVisitor<TypedValue> {
    private dependencies;
    private record?;
    private timeZone;
    private readonly converter;
    constructor(dependencies: {
        [fieldId: string]: FieldCore;
    }, record?: {
        id: string;
        fields: Record<string, unknown>;
        name?: string | undefined;
        autoNumber?: number | undefined;
        createdTime?: string | undefined;
        lastModifiedTime?: string | undefined;
        createdBy?: string | undefined;
        lastModifiedBy?: string | undefined;
        permissions?: Record<string, Record<string, boolean>> | undefined;
        undeletable?: boolean | undefined;
    } | undefined, timeZone?: string);
    visitRoot(ctx: RootContext): TypedValue<any>;
    visitStringLiteral(ctx: StringLiteralContext): any;
    private unescapeString;
    visitIntegerLiteral(ctx: IntegerLiteralContext): any;
    visitDecimalLiteral(ctx: DecimalLiteralContext): any;
    visitBooleanLiteral(ctx: BooleanLiteralContext): any;
    visitLeftWhitespaceOrComments(ctx: LeftWhitespaceOrCommentsContext): any;
    visitRightWhitespaceOrComments(ctx: RightWhitespaceOrCommentsContext): any;
    visitBrackets(ctx: BracketsContext): any;
    private getBinaryOpValueType;
    private transformNodeValue;
    private transformUnaryNodeValue;
    visitUnaryOp(ctx: UnaryOpContext): TypedValue<number | null>;
    visitBinaryOp(ctx: BinaryOpContext): TypedValue<any>;
    private areValuesEqual;
    private areValuesNotEqual;
    private shouldUseStrictBlankEquality;
    private isBlankEqualityValue;
    private normalizeEqualityValues;
    private shouldNormalizeBlankEquality;
    private normalizeBlankEqualityValue;
    private isStringLikeTypedValue;
    private isNumericLikeTypedValue;
    private createTypedValueByField;
    visitFieldReferenceCurly(ctx: FieldReferenceCurlyContext): TypedValue<any>;
    /**
     * transform typed value into function accept value type as possible as it can
     */
    private transformTypedValue;
    visitFunctionCall(ctx: FunctionCallContext): TypedValue<any>;
    protected defaultResult(): TypedValue<null>;
}
