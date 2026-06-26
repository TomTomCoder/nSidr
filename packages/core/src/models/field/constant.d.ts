export declare enum FieldType {
    SingleLineText = "singleLineText",
    LongText = "longText",
    User = "user",
    Attachment = "attachment",
    Checkbox = "checkbox",
    MultipleSelect = "multipleSelect",
    SingleSelect = "singleSelect",
    Date = "date",
    Number = "number",
    Rating = "rating",
    Formula = "formula",
    Rollup = "rollup",
    ConditionalRollup = "conditionalRollup",
    Link = "link",
    CreatedTime = "createdTime",
    LastModifiedTime = "lastModifiedTime",
    CreatedBy = "createdBy",
    LastModifiedBy = "lastModifiedBy",
    AutoNumber = "autoNumber",
    Button = "button",
    Ai = "ai"
}
export declare enum DbFieldType {
    Text = "TEXT",
    Integer = "INTEGER",
    DateTime = "DATETIME",
    Real = "REAL",
    Blob = "BLOB",
    Json = "JSON",
    Boolean = "BOOLEAN"
}
export declare enum CellValueType {
    String = "string",
    Number = "number",
    Boolean = "boolean",
    DateTime = "dateTime"
}
export declare enum Relationship {
    OneOne = "oneOne",
    ManyMany = "manyMany",
    OneMany = "oneMany",
    ManyOne = "manyOne"
}
export declare const RelationshipRevert: {
    oneMany: Relationship;
    manyOne: Relationship;
    manyMany: Relationship;
    oneOne: Relationship;
};
export declare const isMultiValueLink: (relationship: Relationship) => boolean;
export declare const PRIMARY_SUPPORTED_TYPES: Set<FieldType>;
export declare const IMPORT_SUPPORTED_TYPES: FieldType[];
export declare const UNIQUE_VALIDATION_FIELD_TYPES: Set<FieldType>;
export declare const NOT_NULL_VALIDATION_FIELD_TYPES: Set<FieldType>;
