import { OpBuilderAbstract } from '../op-builder.abstract';
import { AddColumnMetaBuilder } from './add-column-meta';
import { AddFieldBuilder } from './add-field';
import { DeleteColumnMetaBuilder } from './delete-column-meta';
import { SetFieldPropertyBuilder } from './set-field-property';
export declare class FieldOpBuilder {
    static editor: {
        addColumnMeta: AddColumnMetaBuilder;
        deleteColumnMeta: DeleteColumnMetaBuilder;
        setFieldProperty: SetFieldPropertyBuilder;
    };
    static creator: AddFieldBuilder;
    static ops2Contexts: typeof OpBuilderAbstract.ops2Contexts;
    static detect: typeof OpBuilderAbstract.detect;
}
