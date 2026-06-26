import { ATN } from 'antlr4ts/atn/ATN';
import { FailedPredicateException } from 'antlr4ts/FailedPredicateException';
import { Parser } from 'antlr4ts/Parser';
import { ParserRuleContext } from 'antlr4ts/ParserRuleContext';
import type { RuleContext } from 'antlr4ts/RuleContext';
import { Token } from 'antlr4ts/Token';
import type { TokenStream } from 'antlr4ts/TokenStream';
import type { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import type { Vocabulary } from 'antlr4ts/Vocabulary';
import type { QueryVisitor } from './QueryVisitor';
export declare class Query extends Parser {
    static readonly COMMA = 1;
    static readonly OPEN_PAREN = 2;
    static readonly CLOSE_PAREN = 3;
    static readonly OPEN_BRACKET = 4;
    static readonly CLOSE_BRACKET = 5;
    static readonly L_CURLY = 6;
    static readonly R_CURLY = 7;
    static readonly SIMPLE_IDENTIFIER = 8;
    static readonly SINGLEQ_STRING_LITERAL = 9;
    static readonly DOUBLEQ_STRING_LITERAL = 10;
    static readonly INTEGER_LITERAL = 11;
    static readonly NUMERIC_LITERAL = 12;
    static readonly EQUAL_OPERATOR = 13;
    static readonly NOT_EQUAL_OPERATOR = 14;
    static readonly GT_OPERATOR = 15;
    static readonly GTE_OPERATOR = 16;
    static readonly LT_OPERATOR = 17;
    static readonly LTE_OPERATOR = 18;
    static readonly TRUE_SYMBOL = 19;
    static readonly FALSE_SYMBOL = 20;
    static readonly AND_SYMBOL = 21;
    static readonly OR_SYMBOL = 22;
    static readonly NOT_SYMBOL = 23;
    static readonly NULL_SYMBOL = 24;
    static readonly IS_SYMBOL = 25;
    static readonly LS_NULL_SYMBOL = 26;
    static readonly LS_NOT_NULL_SYMBOL = 27;
    static readonly LIKE_SYMBOL = 28;
    static readonly IN_SYMBOL = 29;
    static readonly HAS_SYMBOL = 30;
    static readonly NOT_LIKE_SYMBOL = 31;
    static readonly NOT_IN_SYMBOL = 32;
    static readonly WHITESPACE = 33;
    static readonly NOT_EQUAL2_OPERATOR = 34;
    static readonly RULE_start = 0;
    static readonly RULE_expr = 1;
    static readonly RULE_queryStatement = 2;
    static readonly RULE_predicate = 3;
    static readonly RULE_fieldIdentifier = 4;
    static readonly RULE_compOp = 5;
    static readonly RULE_isOp = 6;
    static readonly RULE_likeOp = 7;
    static readonly RULE_inOp = 8;
    static readonly RULE_value = 9;
    static readonly RULE_valueList = 10;
    static readonly RULE_literal = 11;
    static readonly RULE_stringLiteral = 12;
    static readonly RULE_numberLiteral = 13;
    static readonly RULE_booleanLiteral = 14;
    static readonly RULE_nullLiteral = 15;
    static readonly ruleNames: string[];
    private static readonly _LITERAL_NAMES;
    private static readonly _SYMBOLIC_NAMES;
    static readonly VOCABULARY: Vocabulary;
    get vocabulary(): Vocabulary;
    get grammarFileName(): string;
    get ruleNames(): string[];
    get serializedATN(): string;
    protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException;
    constructor(input: TokenStream);
    start(): StartContext;
    expr(): ExprContext;
    expr(_p: number): ExprContext;
    queryStatement(): QueryStatementContext;
    predicate(): PredicateContext;
    fieldIdentifier(): FieldIdentifierContext;
    compOp(): CompOpContext;
    isOp(): IsOpContext;
    likeOp(): LikeOpContext;
    inOp(): InOpContext;
    value(): ValueContext;
    valueList(): ValueListContext;
    literal(): LiteralContext;
    stringLiteral(): StringLiteralContext;
    numberLiteral(): NumberLiteralContext;
    booleanLiteral(): BooleanLiteralContext;
    nullLiteral(): NullLiteralContext;
    sempred(_localctx: RuleContext, ruleIndex: number, predIndex: number): boolean;
    private expr_sempred;
    static readonly _serializedATN: string;
    static __ATN: ATN;
    static get _ATN(): ATN;
}
export declare class StartContext extends ParserRuleContext {
    expr(): ExprContext;
    EOF(): TerminalNode;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class ExprContext extends ParserRuleContext {
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: ExprContext): void;
}
export declare class QueryExprContext extends ExprContext {
    queryStatement(): QueryStatementContext;
    constructor(ctx: ExprContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class BinaryExprContext extends ExprContext {
    _op: Token;
    expr(): ExprContext[];
    expr(i: number): ExprContext;
    AND_SYMBOL(): TerminalNode | undefined;
    OR_SYMBOL(): TerminalNode | undefined;
    constructor(ctx: ExprContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class ParenQueryExprContext extends ExprContext {
    OPEN_PAREN(): TerminalNode;
    expr(): ExprContext;
    CLOSE_PAREN(): TerminalNode;
    constructor(ctx: ExprContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class QueryStatementContext extends ParserRuleContext {
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: QueryStatementContext): void;
}
export declare class PrimaryExprPredicateContext extends QueryStatementContext {
    predicate(): PredicateContext;
    constructor(ctx: QueryStatementContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class PrimaryExprIsContext extends QueryStatementContext {
    fieldIdentifier(): FieldIdentifierContext;
    isOp(): IsOpContext;
    constructor(ctx: QueryStatementContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class PrimaryExprCompareContext extends QueryStatementContext {
    fieldIdentifier(): FieldIdentifierContext;
    compOp(): CompOpContext;
    value(): ValueContext;
    constructor(ctx: QueryStatementContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class PredicateContext extends ParserRuleContext {
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: PredicateContext): void;
}
export declare class PredicateExprLikeContext extends PredicateContext {
    fieldIdentifier(): FieldIdentifierContext;
    likeOp(): LikeOpContext;
    value(): ValueContext;
    constructor(ctx: PredicateContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class PredicateExprInContext extends PredicateContext {
    fieldIdentifier(): FieldIdentifierContext;
    inOp(): InOpContext;
    valueList(): ValueListContext;
    constructor(ctx: PredicateContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class PredicateExprHasContext extends PredicateContext {
    fieldIdentifier(): FieldIdentifierContext;
    HAS_SYMBOL(): TerminalNode;
    valueList(): ValueListContext;
    constructor(ctx: PredicateContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class PredicateExprEqArrayContext extends PredicateContext {
    fieldIdentifier(): FieldIdentifierContext;
    EQUAL_OPERATOR(): TerminalNode;
    valueList(): ValueListContext;
    constructor(ctx: PredicateContext);
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class FieldIdentifierContext extends ParserRuleContext {
    SIMPLE_IDENTIFIER(): TerminalNode;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class CompOpContext extends ParserRuleContext {
    EQUAL_OPERATOR(): TerminalNode | undefined;
    NOT_EQUAL_OPERATOR(): TerminalNode | undefined;
    NOT_EQUAL2_OPERATOR(): TerminalNode | undefined;
    GT_OPERATOR(): TerminalNode | undefined;
    GTE_OPERATOR(): TerminalNode | undefined;
    LT_OPERATOR(): TerminalNode | undefined;
    LTE_OPERATOR(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class IsOpContext extends ParserRuleContext {
    LS_NULL_SYMBOL(): TerminalNode | undefined;
    LS_NOT_NULL_SYMBOL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class LikeOpContext extends ParserRuleContext {
    LIKE_SYMBOL(): TerminalNode | undefined;
    NOT_LIKE_SYMBOL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class InOpContext extends ParserRuleContext {
    IN_SYMBOL(): TerminalNode | undefined;
    NOT_IN_SYMBOL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class ValueContext extends ParserRuleContext {
    literal(): LiteralContext;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class ValueListContext extends ParserRuleContext {
    OPEN_PAREN(): TerminalNode;
    CLOSE_PAREN(): TerminalNode;
    literal(): LiteralContext[];
    literal(i: number): LiteralContext;
    COMMA(): TerminalNode[];
    COMMA(i: number): TerminalNode;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class LiteralContext extends ParserRuleContext {
    stringLiteral(): StringLiteralContext | undefined;
    numberLiteral(): NumberLiteralContext | undefined;
    booleanLiteral(): BooleanLiteralContext | undefined;
    nullLiteral(): NullLiteralContext | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class StringLiteralContext extends ParserRuleContext {
    SINGLEQ_STRING_LITERAL(): TerminalNode | undefined;
    DOUBLEQ_STRING_LITERAL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class NumberLiteralContext extends ParserRuleContext {
    INTEGER_LITERAL(): TerminalNode | undefined;
    NUMERIC_LITERAL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class BooleanLiteralContext extends ParserRuleContext {
    TRUE_SYMBOL(): TerminalNode | undefined;
    FALSE_SYMBOL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
export declare class NullLiteralContext extends ParserRuleContext {
    NULL_SYMBOL(): TerminalNode;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    accept<Result>(visitor: QueryVisitor<Result>): Result;
}
