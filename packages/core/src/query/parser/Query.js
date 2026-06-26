"use strict";
// Generated from src/query/parser/Query.g4 by ANTLR 4.9.0-SNAPSHOT
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullLiteralContext = exports.BooleanLiteralContext = exports.NumberLiteralContext = exports.StringLiteralContext = exports.LiteralContext = exports.ValueListContext = exports.ValueContext = exports.InOpContext = exports.LikeOpContext = exports.IsOpContext = exports.CompOpContext = exports.FieldIdentifierContext = exports.PredicateExprEqArrayContext = exports.PredicateExprHasContext = exports.PredicateExprInContext = exports.PredicateExprLikeContext = exports.PredicateContext = exports.PrimaryExprCompareContext = exports.PrimaryExprIsContext = exports.PrimaryExprPredicateContext = exports.QueryStatementContext = exports.ParenQueryExprContext = exports.BinaryExprContext = exports.QueryExprContext = exports.ExprContext = exports.StartContext = exports.Query = void 0;
const ATN_1 = require("antlr4ts/atn/ATN");
const ATNDeserializer_1 = require("antlr4ts/atn/ATNDeserializer");
const ParserATNSimulator_1 = require("antlr4ts/atn/ParserATNSimulator");
const FailedPredicateException_1 = require("antlr4ts/FailedPredicateException");
const Utils = __importStar(require("antlr4ts/misc/Utils"));
const NoViableAltException_1 = require("antlr4ts/NoViableAltException");
const Parser_1 = require("antlr4ts/Parser");
const ParserRuleContext_1 = require("antlr4ts/ParserRuleContext");
const RecognitionException_1 = require("antlr4ts/RecognitionException");
const Token_1 = require("antlr4ts/Token");
const VocabularyImpl_1 = require("antlr4ts/VocabularyImpl");
class Query extends Parser_1.Parser {
    static COMMA = 1;
    static OPEN_PAREN = 2;
    static CLOSE_PAREN = 3;
    static OPEN_BRACKET = 4;
    static CLOSE_BRACKET = 5;
    static L_CURLY = 6;
    static R_CURLY = 7;
    static SIMPLE_IDENTIFIER = 8;
    static SINGLEQ_STRING_LITERAL = 9;
    static DOUBLEQ_STRING_LITERAL = 10;
    static INTEGER_LITERAL = 11;
    static NUMERIC_LITERAL = 12;
    static EQUAL_OPERATOR = 13;
    static NOT_EQUAL_OPERATOR = 14;
    static GT_OPERATOR = 15;
    static GTE_OPERATOR = 16;
    static LT_OPERATOR = 17;
    static LTE_OPERATOR = 18;
    static TRUE_SYMBOL = 19;
    static FALSE_SYMBOL = 20;
    static AND_SYMBOL = 21;
    static OR_SYMBOL = 22;
    static NOT_SYMBOL = 23;
    static NULL_SYMBOL = 24;
    static IS_SYMBOL = 25;
    static LS_NULL_SYMBOL = 26;
    static LS_NOT_NULL_SYMBOL = 27;
    static LIKE_SYMBOL = 28;
    static IN_SYMBOL = 29;
    static HAS_SYMBOL = 30;
    static NOT_LIKE_SYMBOL = 31;
    static NOT_IN_SYMBOL = 32;
    static WHITESPACE = 33;
    static NOT_EQUAL2_OPERATOR = 34;
    static RULE_start = 0;
    static RULE_expr = 1;
    static RULE_queryStatement = 2;
    static RULE_predicate = 3;
    static RULE_fieldIdentifier = 4;
    static RULE_compOp = 5;
    static RULE_isOp = 6;
    static RULE_likeOp = 7;
    static RULE_inOp = 8;
    static RULE_value = 9;
    static RULE_valueList = 10;
    static RULE_literal = 11;
    static RULE_stringLiteral = 12;
    static RULE_numberLiteral = 13;
    static RULE_booleanLiteral = 14;
    static RULE_nullLiteral = 15;
    static ruleNames = [
        'start',
        'expr',
        'queryStatement',
        'predicate',
        'fieldIdentifier',
        'compOp',
        'isOp',
        'likeOp',
        'inOp',
        'value',
        'valueList',
        'literal',
        'stringLiteral',
        'numberLiteral',
        'booleanLiteral',
        'nullLiteral',
    ];
    static _LITERAL_NAMES = [
        undefined,
        "','",
        "'('",
        "')'",
        "'['",
        "']'",
        "'{'",
        "'}'",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "'='",
        "'!='",
        "'>'",
        "'>='",
        "'<'",
        "'<='",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "'<>'",
    ];
    static _SYMBOLIC_NAMES = [
        undefined,
        'COMMA',
        'OPEN_PAREN',
        'CLOSE_PAREN',
        'OPEN_BRACKET',
        'CLOSE_BRACKET',
        'L_CURLY',
        'R_CURLY',
        'SIMPLE_IDENTIFIER',
        'SINGLEQ_STRING_LITERAL',
        'DOUBLEQ_STRING_LITERAL',
        'INTEGER_LITERAL',
        'NUMERIC_LITERAL',
        'EQUAL_OPERATOR',
        'NOT_EQUAL_OPERATOR',
        'GT_OPERATOR',
        'GTE_OPERATOR',
        'LT_OPERATOR',
        'LTE_OPERATOR',
        'TRUE_SYMBOL',
        'FALSE_SYMBOL',
        'AND_SYMBOL',
        'OR_SYMBOL',
        'NOT_SYMBOL',
        'NULL_SYMBOL',
        'IS_SYMBOL',
        'LS_NULL_SYMBOL',
        'LS_NOT_NULL_SYMBOL',
        'LIKE_SYMBOL',
        'IN_SYMBOL',
        'HAS_SYMBOL',
        'NOT_LIKE_SYMBOL',
        'NOT_IN_SYMBOL',
        'WHITESPACE',
        'NOT_EQUAL2_OPERATOR',
    ];
    static VOCABULARY = new VocabularyImpl_1.VocabularyImpl(Query._LITERAL_NAMES, Query._SYMBOLIC_NAMES, []);
    // @Override
    // @NotNull
    get vocabulary() {
        return Query.VOCABULARY;
    }
    // @Override
    get grammarFileName() {
        return 'Query.g4';
    }
    // @Override
    get ruleNames() {
        return Query.ruleNames;
    }
    // @Override
    get serializedATN() {
        return Query._serializedATN;
    }
    createFailedPredicateException(predicate, message) {
        return new FailedPredicateException_1.FailedPredicateException(this, predicate, message);
    }
    constructor(input) {
        super(input);
        this._interp = new ParserATNSimulator_1.ParserATNSimulator(Query._ATN, this);
    }
    // @RuleVersion(0)
    start() {
        const _localctx = new StartContext(this._ctx, this.state);
        this.enterRule(_localctx, 0, Query.RULE_start);
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 32;
                this.expr(0);
                this.state = 33;
                this.match(Query.EOF);
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    expr(_p) {
        if (_p === undefined) {
            _p = 0;
        }
        const _parentctx = this._ctx;
        const _parentState = this.state;
        let _localctx = new ExprContext(this._ctx, _parentState);
        let _prevctx = _localctx;
        const _startState = 2;
        this.enterRecursionRule(_localctx, 2, Query.RULE_expr, _p);
        let _la;
        try {
            let _alt;
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 41;
                this._errHandler.sync(this);
                switch (this._input.LA(1)) {
                    case Query.SIMPLE_IDENTIFIER:
                        {
                            _localctx = new QueryExprContext(_localctx);
                            this._ctx = _localctx;
                            _prevctx = _localctx;
                            this.state = 36;
                            this.queryStatement();
                        }
                        break;
                    case Query.OPEN_PAREN:
                        {
                            _localctx = new ParenQueryExprContext(_localctx);
                            this._ctx = _localctx;
                            _prevctx = _localctx;
                            this.state = 37;
                            this.match(Query.OPEN_PAREN);
                            this.state = 38;
                            this.expr(0);
                            this.state = 39;
                            this.match(Query.CLOSE_PAREN);
                        }
                        break;
                    default:
                        throw new NoViableAltException_1.NoViableAltException(this);
                }
                this._ctx._stop = this._input.tryLT(-1);
                this.state = 48;
                this._errHandler.sync(this);
                _alt = this.interpreter.adaptivePredict(this._input, 1, this._ctx);
                while (_alt !== 2 && _alt !== ATN_1.ATN.INVALID_ALT_NUMBER) {
                    if (_alt === 1) {
                        if (this._parseListeners != null) {
                            this.triggerExitRuleEvent();
                        }
                        _prevctx = _localctx;
                        {
                            {
                                _localctx = new BinaryExprContext(new ExprContext(_parentctx, _parentState));
                                this.pushNewRecursionContext(_localctx, _startState, Query.RULE_expr);
                                this.state = 43;
                                if (!this.precpred(this._ctx, 2)) {
                                    throw this.createFailedPredicateException('this.precpred(this._ctx, 2)');
                                }
                                this.state = 44;
                                _localctx._op = this._input.LT(1);
                                _la = this._input.LA(1);
                                if (!(_la === Query.AND_SYMBOL || _la === Query.OR_SYMBOL)) {
                                    _localctx._op = this._errHandler.recoverInline(this);
                                }
                                else {
                                    if (this._input.LA(1) === Token_1.Token.EOF) {
                                        this.matchedEOF = true;
                                    }
                                    this._errHandler.reportMatch(this);
                                    this.consume();
                                }
                                this.state = 45;
                                this.expr(3);
                            }
                        }
                    }
                    this.state = 50;
                    this._errHandler.sync(this);
                    _alt = this.interpreter.adaptivePredict(this._input, 1, this._ctx);
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.unrollRecursionContexts(_parentctx);
        }
        return _localctx;
    }
    // @RuleVersion(0)
    queryStatement() {
        let _localctx = new QueryStatementContext(this._ctx, this.state);
        this.enterRule(_localctx, 4, Query.RULE_queryStatement);
        try {
            this.state = 59;
            this._errHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this._input, 2, this._ctx)) {
                case 1:
                    _localctx = new PrimaryExprPredicateContext(_localctx);
                    this.enterOuterAlt(_localctx, 1);
                    {
                        this.state = 51;
                        this.predicate();
                    }
                    break;
                case 2:
                    _localctx = new PrimaryExprIsContext(_localctx);
                    this.enterOuterAlt(_localctx, 2);
                    {
                        this.state = 52;
                        this.fieldIdentifier();
                        this.state = 53;
                        this.isOp();
                    }
                    break;
                case 3:
                    _localctx = new PrimaryExprCompareContext(_localctx);
                    this.enterOuterAlt(_localctx, 3);
                    {
                        this.state = 55;
                        this.fieldIdentifier();
                        this.state = 56;
                        this.compOp();
                        this.state = 57;
                        this.value();
                    }
                    break;
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    predicate() {
        let _localctx = new PredicateContext(this._ctx, this.state);
        this.enterRule(_localctx, 6, Query.RULE_predicate);
        try {
            this.state = 77;
            this._errHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this._input, 3, this._ctx)) {
                case 1:
                    _localctx = new PredicateExprLikeContext(_localctx);
                    this.enterOuterAlt(_localctx, 1);
                    {
                        this.state = 61;
                        this.fieldIdentifier();
                        this.state = 62;
                        this.likeOp();
                        this.state = 63;
                        this.value();
                    }
                    break;
                case 2:
                    _localctx = new PredicateExprInContext(_localctx);
                    this.enterOuterAlt(_localctx, 2);
                    {
                        this.state = 65;
                        this.fieldIdentifier();
                        this.state = 66;
                        this.inOp();
                        this.state = 67;
                        this.valueList();
                    }
                    break;
                case 3:
                    _localctx = new PredicateExprHasContext(_localctx);
                    this.enterOuterAlt(_localctx, 3);
                    {
                        this.state = 69;
                        this.fieldIdentifier();
                        this.state = 70;
                        this.match(Query.HAS_SYMBOL);
                        this.state = 71;
                        this.valueList();
                    }
                    break;
                case 4:
                    _localctx = new PredicateExprEqArrayContext(_localctx);
                    this.enterOuterAlt(_localctx, 4);
                    {
                        this.state = 73;
                        this.fieldIdentifier();
                        this.state = 74;
                        this.match(Query.EQUAL_OPERATOR);
                        this.state = 75;
                        this.valueList();
                    }
                    break;
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    fieldIdentifier() {
        const _localctx = new FieldIdentifierContext(this._ctx, this.state);
        this.enterRule(_localctx, 8, Query.RULE_fieldIdentifier);
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 79;
                this.match(Query.SIMPLE_IDENTIFIER);
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    compOp() {
        const _localctx = new CompOpContext(this._ctx, this.state);
        this.enterRule(_localctx, 10, Query.RULE_compOp);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 81;
                _la = this._input.LA(1);
                if (!(((_la - 13) & ~0x1f) === 0 &&
                    ((1 << (_la - 13)) &
                        ((1 << (Query.EQUAL_OPERATOR - 13)) |
                            (1 << (Query.NOT_EQUAL_OPERATOR - 13)) |
                            (1 << (Query.GT_OPERATOR - 13)) |
                            (1 << (Query.GTE_OPERATOR - 13)) |
                            (1 << (Query.LT_OPERATOR - 13)) |
                            (1 << (Query.LTE_OPERATOR - 13)) |
                            (1 << (Query.NOT_EQUAL2_OPERATOR - 13)))) !==
                        0)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    isOp() {
        const _localctx = new IsOpContext(this._ctx, this.state);
        this.enterRule(_localctx, 12, Query.RULE_isOp);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 83;
                _la = this._input.LA(1);
                if (!(_la === Query.LS_NULL_SYMBOL || _la === Query.LS_NOT_NULL_SYMBOL)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    likeOp() {
        const _localctx = new LikeOpContext(this._ctx, this.state);
        this.enterRule(_localctx, 14, Query.RULE_likeOp);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 85;
                _la = this._input.LA(1);
                if (!(_la === Query.LIKE_SYMBOL || _la === Query.NOT_LIKE_SYMBOL)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    inOp() {
        const _localctx = new InOpContext(this._ctx, this.state);
        this.enterRule(_localctx, 16, Query.RULE_inOp);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 87;
                _la = this._input.LA(1);
                if (!(_la === Query.IN_SYMBOL || _la === Query.NOT_IN_SYMBOL)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    value() {
        const _localctx = new ValueContext(this._ctx, this.state);
        this.enterRule(_localctx, 18, Query.RULE_value);
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 89;
                this.literal();
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    valueList() {
        const _localctx = new ValueListContext(this._ctx, this.state);
        this.enterRule(_localctx, 20, Query.RULE_valueList);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 91;
                this.match(Query.OPEN_PAREN);
                this.state = 100;
                this._errHandler.sync(this);
                _la = this._input.LA(1);
                if ((_la & ~0x1f) === 0 &&
                    ((1 << _la) &
                        ((1 << Query.SINGLEQ_STRING_LITERAL) |
                            (1 << Query.DOUBLEQ_STRING_LITERAL) |
                            (1 << Query.INTEGER_LITERAL) |
                            (1 << Query.NUMERIC_LITERAL) |
                            (1 << Query.TRUE_SYMBOL) |
                            (1 << Query.FALSE_SYMBOL) |
                            (1 << Query.NULL_SYMBOL))) !==
                        0) {
                    {
                        this.state = 92;
                        this.literal();
                        this.state = 97;
                        this._errHandler.sync(this);
                        _la = this._input.LA(1);
                        while (_la === Query.COMMA) {
                            {
                                {
                                    this.state = 93;
                                    this.match(Query.COMMA);
                                    this.state = 94;
                                    this.literal();
                                }
                            }
                            this.state = 99;
                            this._errHandler.sync(this);
                            _la = this._input.LA(1);
                        }
                    }
                }
                this.state = 102;
                this.match(Query.CLOSE_PAREN);
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    literal() {
        const _localctx = new LiteralContext(this._ctx, this.state);
        this.enterRule(_localctx, 22, Query.RULE_literal);
        try {
            this.state = 108;
            this._errHandler.sync(this);
            switch (this._input.LA(1)) {
                case Query.SINGLEQ_STRING_LITERAL:
                case Query.DOUBLEQ_STRING_LITERAL:
                    this.enterOuterAlt(_localctx, 1);
                    {
                        this.state = 104;
                        this.stringLiteral();
                    }
                    break;
                case Query.INTEGER_LITERAL:
                case Query.NUMERIC_LITERAL:
                    this.enterOuterAlt(_localctx, 2);
                    {
                        this.state = 105;
                        this.numberLiteral();
                    }
                    break;
                case Query.TRUE_SYMBOL:
                case Query.FALSE_SYMBOL:
                    this.enterOuterAlt(_localctx, 3);
                    {
                        this.state = 106;
                        this.booleanLiteral();
                    }
                    break;
                case Query.NULL_SYMBOL:
                    this.enterOuterAlt(_localctx, 4);
                    {
                        this.state = 107;
                        this.nullLiteral();
                    }
                    break;
                default:
                    throw new NoViableAltException_1.NoViableAltException(this);
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    stringLiteral() {
        const _localctx = new StringLiteralContext(this._ctx, this.state);
        this.enterRule(_localctx, 24, Query.RULE_stringLiteral);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 110;
                _la = this._input.LA(1);
                if (!(_la === Query.SINGLEQ_STRING_LITERAL || _la === Query.DOUBLEQ_STRING_LITERAL)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    numberLiteral() {
        const _localctx = new NumberLiteralContext(this._ctx, this.state);
        this.enterRule(_localctx, 26, Query.RULE_numberLiteral);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 112;
                _la = this._input.LA(1);
                if (!(_la === Query.INTEGER_LITERAL || _la === Query.NUMERIC_LITERAL)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    booleanLiteral() {
        const _localctx = new BooleanLiteralContext(this._ctx, this.state);
        this.enterRule(_localctx, 28, Query.RULE_booleanLiteral);
        let _la;
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 114;
                _la = this._input.LA(1);
                if (!(_la === Query.TRUE_SYMBOL || _la === Query.FALSE_SYMBOL)) {
                    this._errHandler.recoverInline(this);
                }
                else {
                    if (this._input.LA(1) === Token_1.Token.EOF) {
                        this.matchedEOF = true;
                    }
                    this._errHandler.reportMatch(this);
                    this.consume();
                }
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    // @RuleVersion(0)
    nullLiteral() {
        const _localctx = new NullLiteralContext(this._ctx, this.state);
        this.enterRule(_localctx, 30, Query.RULE_nullLiteral);
        try {
            this.enterOuterAlt(_localctx, 1);
            {
                this.state = 116;
                this.match(Query.NULL_SYMBOL);
            }
        }
        catch (re) {
            if (re instanceof RecognitionException_1.RecognitionException) {
                _localctx.exception = re;
                this._errHandler.reportError(this, re);
                this._errHandler.recover(this, re);
            }
            else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return _localctx;
    }
    sempred(_localctx, ruleIndex, predIndex) {
        switch (ruleIndex) {
            case 1:
                return this.expr_sempred(_localctx, predIndex);
        }
        return true;
    }
    expr_sempred(_localctx, predIndex) {
        switch (predIndex) {
            case 0:
                return this.precpred(this._ctx, 2);
        }
        return true;
    }
    static _serializedATN = '\x03\uC91D\uCABA\u058D\uAFBA\u4F53\u0607\uEA8B\uC241\x03$y\x04\x02\t\x02' +
        '\x04\x03\t\x03\x04\x04\t\x04\x04\x05\t\x05\x04\x06\t\x06\x04\x07\t\x07' +
        '\x04\b\t\b\x04\t\t\t\x04\n\t\n\x04\v\t\v\x04\f\t\f\x04\r\t\r\x04\x0E\t' +
        '\x0E\x04\x0F\t\x0F\x04\x10\t\x10\x04\x11\t\x11\x03\x02\x03\x02\x03\x02' +
        '\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x03\x05\x03,\n\x03\x03\x03' +
        '\x03\x03\x03\x03\x07\x031\n\x03\f\x03\x0E\x034\v\x03\x03\x04\x03\x04\x03' +
        '\x04\x03\x04\x03\x04\x03\x04\x03\x04\x03\x04\x05\x04>\n\x04\x03\x05\x03' +
        '\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03' +
        '\x05\x03\x05\x03\x05\x03\x05\x03\x05\x03\x05\x05\x05P\n\x05\x03\x06\x03' +
        '\x06\x03\x07\x03\x07\x03\b\x03\b\x03\t\x03\t\x03\n\x03\n\x03\v\x03\v\x03' +
        '\f\x03\f\x03\f\x03\f\x07\fb\n\f\f\f\x0E\fe\v\f\x05\fg\n\f\x03\f\x03\f' +
        '\x03\r\x03\r\x03\r\x03\r\x05\ro\n\r\x03\x0E\x03\x0E\x03\x0F\x03\x0F\x03' +
        '\x10\x03\x10\x03\x11\x03\x11\x03\x11\x02\x02\x03\x04\x12\x02\x02\x04\x02' +
        '\x06\x02\b\x02\n\x02\f\x02\x0E\x02\x10\x02\x12\x02\x14\x02\x16\x02\x18' +
        '\x02\x1A\x02\x1C\x02\x1E\x02 \x02\x02\n\x03\x02\x17\x18\x04\x02\x0F\x14' +
        '$$\x03\x02\x1C\x1D\x04\x02\x1E\x1E!!\x04\x02\x1F\x1F""\x03\x02\v\f\x03' +
        '\x02\r\x0E\x03\x02\x15\x16\x02t\x02"\x03\x02\x02\x02\x04+\x03\x02\x02' +
        '\x02\x06=\x03\x02\x02\x02\bO\x03\x02\x02\x02\nQ\x03\x02\x02\x02\fS\x03' +
        '\x02\x02\x02\x0EU\x03\x02\x02\x02\x10W\x03\x02\x02\x02\x12Y\x03\x02\x02' +
        '\x02\x14[\x03\x02\x02\x02\x16]\x03\x02\x02\x02\x18n\x03\x02\x02\x02\x1A' +
        'p\x03\x02\x02\x02\x1Cr\x03\x02\x02\x02\x1Et\x03\x02\x02\x02 v\x03\x02' +
        '\x02\x02"#\x05\x04\x03\x02#$\x07\x02\x02\x03$\x03\x03\x02\x02\x02%&\b' +
        "\x03\x01\x02&,\x05\x06\x04\x02'(\x07\x04\x02\x02()\x05\x04\x03\x02)*" +
        "\x07\x05\x02\x02*,\x03\x02\x02\x02+%\x03\x02\x02\x02+'\x03\x02\x02\x02" +
        ',2\x03\x02\x02\x02-.\f\x04\x02\x02./\t\x02\x02\x02/1\x05\x04\x03\x050' +
        '-\x03\x02\x02\x0214\x03\x02\x02\x0220\x03\x02\x02\x0223\x03\x02\x02\x02' +
        '3\x05\x03\x02\x02\x0242\x03\x02\x02\x025>\x05\b\x05\x0267\x05\n\x06\x02' +
        '78\x05\x0E\b\x028>\x03\x02\x02\x029:\x05\n\x06\x02:;\x05\f\x07\x02;<\x05' +
        '\x14\v\x02<>\x03\x02\x02\x02=5\x03\x02\x02\x02=6\x03\x02\x02\x02=9\x03' +
        '\x02\x02\x02>\x07\x03\x02\x02\x02?@\x05\n\x06\x02@A\x05\x10\t\x02AB\x05' +
        '\x14\v\x02BP\x03\x02\x02\x02CD\x05\n\x06\x02DE\x05\x12\n\x02EF\x05\x16' +
        '\f\x02FP\x03\x02\x02\x02GH\x05\n\x06\x02HI\x07 \x02\x02IJ\x05\x16\f\x02' +
        'JP\x03\x02\x02\x02KL\x05\n\x06\x02LM\x07\x0F\x02\x02MN\x05\x16\f\x02N' +
        'P\x03\x02\x02\x02O?\x03\x02\x02\x02OC\x03\x02\x02\x02OG\x03\x02\x02\x02' +
        'OK\x03\x02\x02\x02P\t\x03\x02\x02\x02QR\x07\n\x02\x02R\v\x03\x02\x02\x02' +
        'ST\t\x03\x02\x02T\r\x03\x02\x02\x02UV\t\x04\x02\x02V\x0F\x03\x02\x02\x02' +
        'WX\t\x05\x02\x02X\x11\x03\x02\x02\x02YZ\t\x06\x02\x02Z\x13\x03\x02\x02' +
        '\x02[\\\x05\x18\r\x02\\\x15\x03\x02\x02\x02]f\x07\x04\x02\x02^c\x05\x18' +
        '\r\x02_`\x07\x03\x02\x02`b\x05\x18\r\x02a_\x03\x02\x02\x02be\x03\x02\x02' +
        '\x02ca\x03\x02\x02\x02cd\x03\x02\x02\x02dg\x03\x02\x02\x02ec\x03\x02\x02' +
        '\x02f^\x03\x02\x02\x02fg\x03\x02\x02\x02gh\x03\x02\x02\x02hi\x07\x05\x02' +
        '\x02i\x17\x03\x02\x02\x02jo\x05\x1A\x0E\x02ko\x05\x1C\x0F\x02lo\x05\x1E' +
        '\x10\x02mo\x05 \x11\x02nj\x03\x02\x02\x02nk\x03\x02\x02\x02nl\x03\x02' +
        '\x02\x02nm\x03\x02\x02\x02o\x19\x03\x02\x02\x02pq\t\x07\x02\x02q\x1B\x03' +
        '\x02\x02\x02rs\t\b\x02\x02s\x1D\x03\x02\x02\x02tu\t\t\x02\x02u\x1F\x03' +
        '\x02\x02\x02vw\x07\x1A\x02\x02w!\x03\x02\x02\x02\t+2=Ocfn';
    static __ATN;
    static get _ATN() {
        if (!Query.__ATN) {
            Query.__ATN = new ATNDeserializer_1.ATNDeserializer().deserialize(Utils.toCharArray(Query._serializedATN));
        }
        return Query.__ATN;
    }
}
exports.Query = Query;
class StartContext extends ParserRuleContext_1.ParserRuleContext {
    expr() {
        return this.getRuleContext(0, ExprContext);
    }
    EOF() {
        return this.getToken(Query.EOF, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_start;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitStart) {
            return visitor.visitStart(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.StartContext = StartContext;
class ExprContext extends ParserRuleContext_1.ParserRuleContext {
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_expr;
    }
    copyFrom(ctx) {
        super.copyFrom(ctx);
    }
}
exports.ExprContext = ExprContext;
class QueryExprContext extends ExprContext {
    queryStatement() {
        return this.getRuleContext(0, QueryStatementContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitQueryExpr) {
            return visitor.visitQueryExpr(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.QueryExprContext = QueryExprContext;
class BinaryExprContext extends ExprContext {
    _op;
    expr(i) {
        if (i === undefined) {
            return this.getRuleContexts(ExprContext);
        }
        else {
            return this.getRuleContext(i, ExprContext);
        }
    }
    AND_SYMBOL() {
        return this.tryGetToken(Query.AND_SYMBOL, 0);
    }
    OR_SYMBOL() {
        return this.tryGetToken(Query.OR_SYMBOL, 0);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitBinaryExpr) {
            return visitor.visitBinaryExpr(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.BinaryExprContext = BinaryExprContext;
class ParenQueryExprContext extends ExprContext {
    OPEN_PAREN() {
        return this.getToken(Query.OPEN_PAREN, 0);
    }
    expr() {
        return this.getRuleContext(0, ExprContext);
    }
    CLOSE_PAREN() {
        return this.getToken(Query.CLOSE_PAREN, 0);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitParenQueryExpr) {
            return visitor.visitParenQueryExpr(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.ParenQueryExprContext = ParenQueryExprContext;
class QueryStatementContext extends ParserRuleContext_1.ParserRuleContext {
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_queryStatement;
    }
    copyFrom(ctx) {
        super.copyFrom(ctx);
    }
}
exports.QueryStatementContext = QueryStatementContext;
class PrimaryExprPredicateContext extends QueryStatementContext {
    predicate() {
        return this.getRuleContext(0, PredicateContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPrimaryExprPredicate) {
            return visitor.visitPrimaryExprPredicate(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PrimaryExprPredicateContext = PrimaryExprPredicateContext;
class PrimaryExprIsContext extends QueryStatementContext {
    fieldIdentifier() {
        return this.getRuleContext(0, FieldIdentifierContext);
    }
    isOp() {
        return this.getRuleContext(0, IsOpContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPrimaryExprIs) {
            return visitor.visitPrimaryExprIs(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PrimaryExprIsContext = PrimaryExprIsContext;
class PrimaryExprCompareContext extends QueryStatementContext {
    fieldIdentifier() {
        return this.getRuleContext(0, FieldIdentifierContext);
    }
    compOp() {
        return this.getRuleContext(0, CompOpContext);
    }
    value() {
        return this.getRuleContext(0, ValueContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPrimaryExprCompare) {
            return visitor.visitPrimaryExprCompare(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PrimaryExprCompareContext = PrimaryExprCompareContext;
class PredicateContext extends ParserRuleContext_1.ParserRuleContext {
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_predicate;
    }
    copyFrom(ctx) {
        super.copyFrom(ctx);
    }
}
exports.PredicateContext = PredicateContext;
class PredicateExprLikeContext extends PredicateContext {
    fieldIdentifier() {
        return this.getRuleContext(0, FieldIdentifierContext);
    }
    likeOp() {
        return this.getRuleContext(0, LikeOpContext);
    }
    value() {
        return this.getRuleContext(0, ValueContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPredicateExprLike) {
            return visitor.visitPredicateExprLike(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PredicateExprLikeContext = PredicateExprLikeContext;
class PredicateExprInContext extends PredicateContext {
    fieldIdentifier() {
        return this.getRuleContext(0, FieldIdentifierContext);
    }
    inOp() {
        return this.getRuleContext(0, InOpContext);
    }
    valueList() {
        return this.getRuleContext(0, ValueListContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPredicateExprIn) {
            return visitor.visitPredicateExprIn(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PredicateExprInContext = PredicateExprInContext;
class PredicateExprHasContext extends PredicateContext {
    fieldIdentifier() {
        return this.getRuleContext(0, FieldIdentifierContext);
    }
    HAS_SYMBOL() {
        return this.getToken(Query.HAS_SYMBOL, 0);
    }
    valueList() {
        return this.getRuleContext(0, ValueListContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPredicateExprHas) {
            return visitor.visitPredicateExprHas(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PredicateExprHasContext = PredicateExprHasContext;
class PredicateExprEqArrayContext extends PredicateContext {
    fieldIdentifier() {
        return this.getRuleContext(0, FieldIdentifierContext);
    }
    EQUAL_OPERATOR() {
        return this.getToken(Query.EQUAL_OPERATOR, 0);
    }
    valueList() {
        return this.getRuleContext(0, ValueListContext);
    }
    constructor(ctx) {
        super(ctx.parent, ctx.invokingState);
        this.copyFrom(ctx);
    }
    // @Override
    accept(visitor) {
        if (visitor.visitPredicateExprEqArray) {
            return visitor.visitPredicateExprEqArray(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.PredicateExprEqArrayContext = PredicateExprEqArrayContext;
class FieldIdentifierContext extends ParserRuleContext_1.ParserRuleContext {
    SIMPLE_IDENTIFIER() {
        return this.getToken(Query.SIMPLE_IDENTIFIER, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_fieldIdentifier;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitFieldIdentifier) {
            return visitor.visitFieldIdentifier(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.FieldIdentifierContext = FieldIdentifierContext;
class CompOpContext extends ParserRuleContext_1.ParserRuleContext {
    EQUAL_OPERATOR() {
        return this.tryGetToken(Query.EQUAL_OPERATOR, 0);
    }
    NOT_EQUAL_OPERATOR() {
        return this.tryGetToken(Query.NOT_EQUAL_OPERATOR, 0);
    }
    NOT_EQUAL2_OPERATOR() {
        return this.tryGetToken(Query.NOT_EQUAL2_OPERATOR, 0);
    }
    GT_OPERATOR() {
        return this.tryGetToken(Query.GT_OPERATOR, 0);
    }
    GTE_OPERATOR() {
        return this.tryGetToken(Query.GTE_OPERATOR, 0);
    }
    LT_OPERATOR() {
        return this.tryGetToken(Query.LT_OPERATOR, 0);
    }
    LTE_OPERATOR() {
        return this.tryGetToken(Query.LTE_OPERATOR, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_compOp;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitCompOp) {
            return visitor.visitCompOp(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.CompOpContext = CompOpContext;
class IsOpContext extends ParserRuleContext_1.ParserRuleContext {
    LS_NULL_SYMBOL() {
        return this.tryGetToken(Query.LS_NULL_SYMBOL, 0);
    }
    LS_NOT_NULL_SYMBOL() {
        return this.tryGetToken(Query.LS_NOT_NULL_SYMBOL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_isOp;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitIsOp) {
            return visitor.visitIsOp(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.IsOpContext = IsOpContext;
class LikeOpContext extends ParserRuleContext_1.ParserRuleContext {
    LIKE_SYMBOL() {
        return this.tryGetToken(Query.LIKE_SYMBOL, 0);
    }
    NOT_LIKE_SYMBOL() {
        return this.tryGetToken(Query.NOT_LIKE_SYMBOL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_likeOp;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitLikeOp) {
            return visitor.visitLikeOp(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.LikeOpContext = LikeOpContext;
class InOpContext extends ParserRuleContext_1.ParserRuleContext {
    IN_SYMBOL() {
        return this.tryGetToken(Query.IN_SYMBOL, 0);
    }
    NOT_IN_SYMBOL() {
        return this.tryGetToken(Query.NOT_IN_SYMBOL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_inOp;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitInOp) {
            return visitor.visitInOp(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.InOpContext = InOpContext;
class ValueContext extends ParserRuleContext_1.ParserRuleContext {
    literal() {
        return this.getRuleContext(0, LiteralContext);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_value;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitValue) {
            return visitor.visitValue(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.ValueContext = ValueContext;
class ValueListContext extends ParserRuleContext_1.ParserRuleContext {
    OPEN_PAREN() {
        return this.getToken(Query.OPEN_PAREN, 0);
    }
    CLOSE_PAREN() {
        return this.getToken(Query.CLOSE_PAREN, 0);
    }
    literal(i) {
        if (i === undefined) {
            return this.getRuleContexts(LiteralContext);
        }
        else {
            return this.getRuleContext(i, LiteralContext);
        }
    }
    COMMA(i) {
        if (i === undefined) {
            return this.getTokens(Query.COMMA);
        }
        else {
            return this.getToken(Query.COMMA, i);
        }
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_valueList;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitValueList) {
            return visitor.visitValueList(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.ValueListContext = ValueListContext;
class LiteralContext extends ParserRuleContext_1.ParserRuleContext {
    stringLiteral() {
        return this.tryGetRuleContext(0, StringLiteralContext);
    }
    numberLiteral() {
        return this.tryGetRuleContext(0, NumberLiteralContext);
    }
    booleanLiteral() {
        return this.tryGetRuleContext(0, BooleanLiteralContext);
    }
    nullLiteral() {
        return this.tryGetRuleContext(0, NullLiteralContext);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_literal;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitLiteral) {
            return visitor.visitLiteral(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.LiteralContext = LiteralContext;
class StringLiteralContext extends ParserRuleContext_1.ParserRuleContext {
    SINGLEQ_STRING_LITERAL() {
        return this.tryGetToken(Query.SINGLEQ_STRING_LITERAL, 0);
    }
    DOUBLEQ_STRING_LITERAL() {
        return this.tryGetToken(Query.DOUBLEQ_STRING_LITERAL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_stringLiteral;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitStringLiteral) {
            return visitor.visitStringLiteral(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.StringLiteralContext = StringLiteralContext;
class NumberLiteralContext extends ParserRuleContext_1.ParserRuleContext {
    INTEGER_LITERAL() {
        return this.tryGetToken(Query.INTEGER_LITERAL, 0);
    }
    NUMERIC_LITERAL() {
        return this.tryGetToken(Query.NUMERIC_LITERAL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_numberLiteral;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitNumberLiteral) {
            return visitor.visitNumberLiteral(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.NumberLiteralContext = NumberLiteralContext;
class BooleanLiteralContext extends ParserRuleContext_1.ParserRuleContext {
    TRUE_SYMBOL() {
        return this.tryGetToken(Query.TRUE_SYMBOL, 0);
    }
    FALSE_SYMBOL() {
        return this.tryGetToken(Query.FALSE_SYMBOL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_booleanLiteral;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitBooleanLiteral) {
            return visitor.visitBooleanLiteral(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.BooleanLiteralContext = BooleanLiteralContext;
class NullLiteralContext extends ParserRuleContext_1.ParserRuleContext {
    NULL_SYMBOL() {
        return this.getToken(Query.NULL_SYMBOL, 0);
    }
    constructor(parent, invokingState) {
        super(parent, invokingState);
    }
    // @Override
    get ruleIndex() {
        return Query.RULE_nullLiteral;
    }
    // @Override
    accept(visitor) {
        if (visitor.visitNullLiteral) {
            return visitor.visitNullLiteral(this);
        }
        else {
            return visitor.visitChildren(this);
        }
    }
}
exports.NullLiteralContext = NullLiteralContext;
