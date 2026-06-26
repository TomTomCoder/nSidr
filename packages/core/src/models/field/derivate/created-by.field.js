"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatedByFieldCore = void 0;
const user_field_abstract_1 = require("./abstract/user.field.abstract");
const created_by_option_schema_1 = require("./created-by-option.schema");
class CreatedByFieldCore extends user_field_abstract_1.UserAbstractCore {
    type;
    options;
    get isStructuredCellValue() {
        return true;
    }
    convertStringToCellValue(_value) {
        return null;
    }
    getIsPersistedAsGeneratedColumn() {
        return this.meta?.persistedAsGeneratedColumn === true;
    }
    shouldPersistAuditValue() {
        return !this.isLookup && !this.getIsPersistedAsGeneratedColumn();
    }
    repair(_value) {
        return null;
    }
    validateOptions() {
        return created_by_option_schema_1.createdByFieldOptionsSchema.safeParse(this.options);
    }
    accept(visitor) {
        return visitor.visitCreatedByField(this);
    }
}
exports.CreatedByFieldCore = CreatedByFieldCore;
