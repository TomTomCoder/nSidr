import { DefaultErrorStrategy } from 'antlr4ts';
import type { Parser } from 'antlr4ts/Parser';
import type { RecognitionException } from 'antlr4ts/RecognitionException';
export declare class JsonErrorStrategy extends DefaultErrorStrategy {
    reportError(parser: Parser, _recognitionException: RecognitionException): void;
    protected reportUnwantedToken(recognizer: Parser): void;
}
