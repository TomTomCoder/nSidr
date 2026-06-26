import type { IOtOperation } from '../models';
import type { IOpBuilder } from './interface';
export declare abstract class OpBuilderAbstract {
    static editor: {
        [key: string]: IOpBuilder;
    };
    static ops2Contexts(ops: IOtOperation[]): import("./interface").IOpContextBase[];
    static detect(op: IOtOperation): import("./interface").IOpContextBase | null;
}
