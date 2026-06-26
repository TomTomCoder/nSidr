import { OpBuilderAbstract } from '../op-builder.abstract';
import { AddTableBuilder } from './add-table';
import { SetTablePropertyBuilder } from './set-table-property';
export declare class TableOpBuilder {
    static editor: {
        setTableProperty: SetTablePropertyBuilder;
    };
    static creator: AddTableBuilder;
    static ops2Contexts: typeof OpBuilderAbstract.ops2Contexts;
    static detect: typeof OpBuilderAbstract.detect;
}
