"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormulaFieldCore = void 0;
const formula_1 = require("@teable/formula");
const zod_1 = require("zod");
const formula_2 = require("../../../formula");
const constant_1 = require("../constant");
const field_util_1 = require("../field.util");
const formatting_1 = require("../formatting");
const show_as_1 = require("../show-as");
const formula_field_abstract_1 = require("./abstract/formula.field.abstract");
const formulaFieldCellValueSchema = zod_1.z.any();
class FormulaFieldCore extends formula_field_abstract_1.FormulaAbstractCore {
    static defaultOptions(cellValueType) {
        return {
            expression: '',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            formatting: (0, formatting_1.getDefaultFormatting)(cellValueType),
        };
    }
    static convertExpressionIdToName(expression, dependFieldMap) {
        const tree = this.parse(expression);
        const nameToId = Object.entries(dependFieldMap).reduce((acc, [fieldId, field]) => {
            acc[fieldId] = field?.name;
            return acc;
        }, {});
        const visitor = new formula_1.ConversionVisitor(nameToId);
        visitor.safe().visit(tree);
        return visitor.getResult();
    }
    static convertExpressionNameToId(expression, dependFieldMap) {
        const tree = this.parse(expression);
        const idToName = Object.entries(dependFieldMap).reduce((acc, [fieldId, field]) => {
            acc[field.name] = fieldId;
            return acc;
        }, {});
        const visitor = new formula_1.ConversionVisitor(idToName);
        visitor.visit(tree);
        return visitor.getResult();
    }
    static getReferenceFieldIds(expression) {
        const tree = this.parse(expression);
        const visitor = new formula_1.FieldReferenceVisitor();
        return Array.from(new Set(visitor.visit(tree)));
    }
    static getParsedValueType(expression, dependFieldMap) {
        const tree = this.parse(expression);
        const visitor = new formula_2.EvalVisitor(dependFieldMap);
        const typedValue = visitor.visit(tree);
        return {
            cellValueType: typedValue.type,
            isMultipleCellValue: typedValue.isMultiple,
        };
    }
    type;
    getExpression() {
        return this.options.expression;
    }
    getReferenceFieldIds() {
        const visitor = new formula_1.FieldReferenceVisitor();
        return Array.from(new Set(visitor.visit(this.tree)));
    }
    /**
     * Get referenced fields from a table domain
     * @param tableDomain - The table domain to search for referenced fields
     * @returns Array of referenced field instances
     */
    getReferenceFields(tableDomain) {
        const referenceFieldIds = this.getReferenceFieldIds();
        const referenceFields = [];
        for (const fieldId of referenceFieldIds) {
            const field = tableDomain.getField(fieldId);
            if (field) {
                referenceFields.push(field);
            }
        }
        return referenceFields;
    }
    /**
     * Check recursively whether all references in this formula are resolvable in the given table
     * - Missing referenced field returns true (unresolved)
     * - If a referenced formula exists but itself has unresolved references (or hasError), returns true
     */
    hasUnresolvedReferences(tableDomain, visited = new Set()) {
        // Prevent infinite loops on circular references
        if (visited.has(this.id))
            return false;
        visited.add(this.id);
        const ids = this.getReferenceFieldIds();
        for (const id of ids) {
            const ref = tableDomain.getField(id);
            if (!ref)
                return true;
            if (ref.hasError)
                return true;
            // Drill down if the referenced field is a formula
            if (ref.type === constant_1.FieldType.Formula && !ref.isLookup) {
                const refFormula = ref;
                if (refFormula.hasUnresolvedReferences(tableDomain, visited))
                    return true;
            }
        }
        return false;
    }
    getLinkFields(tableDomain) {
        return this.getReferenceFields(tableDomain).flatMap((field) => {
            if ((0, field_util_1.isLinkField)(field)) {
                return field;
            }
            return field.getLinkFields(tableDomain);
        });
    }
    /**
     * Get the generated column name for database-generated formula fields
     * This should match the naming convention used in database-column-visitor
     */
    getGeneratedColumnName() {
        return this.dbFieldName;
    }
    getIsPersistedAsGeneratedColumn() {
        return this.meta?.persistedAsGeneratedColumn || false;
    }
    /**
     * Recalculates and updates the cellValueType, isMultipleCellValue, and dbFieldType for this formula field
     * based on its expression and the current field context
     * @param fieldMap Map of field ID to field instance for context
     */
    recalculateFieldTypes(fieldMap) {
        const { cellValueType, isMultipleCellValue } = FormulaFieldCore.getParsedValueType(this.options.expression, fieldMap);
        this.cellValueType = cellValueType;
        this.isMultipleCellValue = isMultipleCellValue;
        // Update dbFieldType using the base class method
        this.updateDbFieldType();
    }
    validateOptions() {
        return zod_1.z
            .object({
            expression: zod_1.z.string(),
            formatting: (0, formatting_1.getFormattingSchema)(this.cellValueType),
            showAs: (0, show_as_1.getShowAsSchema)(this.cellValueType, this.isMultipleCellValue),
        })
            .safeParse(this.options);
    }
    accept(visitor) {
        return visitor.visitFormulaField(this);
    }
}
exports.FormulaFieldCore = FormulaFieldCore;
