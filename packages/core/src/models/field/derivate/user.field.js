"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFieldCore = exports.defaultUserFieldOptions = void 0;
const user_field_abstract_1 = require("./abstract/user.field.abstract");
const user_option_schema_1 = require("./user-option.schema");
exports.defaultUserFieldOptions = {
    isMultiple: false,
    shouldNotify: true,
};
class UserFieldCore extends user_field_abstract_1.UserAbstractCore {
    type;
    options;
    static defaultOptions() {
        return exports.defaultUserFieldOptions;
    }
    get isStructuredCellValue() {
        return true;
    }
    /*
     * If the field matches the full name, or email of exactly one user, it will be converted to that user;
     * If the content of a cell does not match any of the users, or if the content is ambiguous (e.g., there are two collaborators with the same name), the cell will be cleared.
     */
    convertStringToCellValue(value, ctx) {
        if (this.isLookup || !value) {
            return null;
        }
        const cellValue = value.split(',').map((s) => s.trim());
        if (this.isMultipleCellValue) {
            const cvArray = cellValue
                .map((v) => {
                return this.matchUser(v, ctx?.userSets);
            })
                .filter(Boolean);
            return cvArray.length ? cvArray : null;
        }
        return this.matchUser(cellValue[0], ctx?.userSets);
    }
    matchUser(value, userSets = []) {
        const foundUser = userSets.find((user) => {
            const { id, name, email } = user;
            return value === id || value === name || value === email;
        });
        return foundUser ? { id: foundUser.id, title: foundUser.name, email: foundUser.email } : null;
    }
    repair(value) {
        if (this.isLookup) {
            return null;
        }
        if (this.validateCellValue(value).success) {
            return value;
        }
        return null;
    }
    validateOptions() {
        return user_option_schema_1.userFieldOptionsSchema.safeParse(this.options);
    }
    accept(visitor) {
        return visitor.visitUserField(this);
    }
}
exports.UserFieldCore = UserFieldCore;
