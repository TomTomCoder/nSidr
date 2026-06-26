import type { IOtOperation } from '../models';
import type { OpName } from './common';
export interface IOpContextBase {
    name: OpName;
}
export interface IOpBuilder {
    name: OpName;
    build(...params: unknown[]): IOtOperation;
    detect(op: IOtOperation): IOpContextBase | null;
}
export interface ICreateOpBuilder {
    name: OpName;
    build(...params: unknown[]): unknown;
}
