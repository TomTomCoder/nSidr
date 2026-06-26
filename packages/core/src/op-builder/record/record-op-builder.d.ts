import { OpBuilderAbstract } from '../op-builder.abstract';
import { AddRecordBuilder } from './add-record';
import { SetRecordBuilder } from './set-record';
export declare class RecordOpBuilder {
    static editor: {
        setRecord: SetRecordBuilder;
    };
    static creator: AddRecordBuilder;
    static ops2Contexts: typeof OpBuilderAbstract.ops2Contexts;
    static detect: typeof OpBuilderAbstract.detect;
}
