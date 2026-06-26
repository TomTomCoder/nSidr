
//#region src/index.ts
const tableI18nKeys = {
	validation: {
		link: {
			batch_duplicate: "validation.link.batch_duplicate",
			one_many_duplicate: "validation.link.one_many_duplicate",
			one_one_duplicate: "validation.link.one_one_duplicate"
		},
		field: { maxColumnLimit: "validation.field.maxColumnLimit" }
	},
	field: { default: {
		singleLineText: { title: "field.default.singleLineText.title" },
		longText: { title: "field.default.longText.title" },
		number: { title: "field.default.number.title" },
		rating: { title: "field.default.rating.title" },
		singleSelect: { title: "field.default.singleSelect.title" },
		multipleSelect: { title: "field.default.multipleSelect.title" },
		checkbox: { title: "field.default.checkbox.title" },
		attachment: { title: "field.default.attachment.title" },
		user: { title: "field.default.user.title" },
		date: { title: "field.default.date.title" },
		createdTime: { title: "field.default.createdTime.title" },
		lastModifiedTime: { title: "field.default.lastModifiedTime.title" },
		createdBy: { title: "field.default.createdBy.title" },
		lastModifiedBy: { title: "field.default.lastModifiedBy.title" },
		autoNumber: { title: "field.default.autoNumber.title" },
		button: { title: "field.default.button.title" },
		formula: { title: "field.default.formula.title" },
		lookup: { title: "field.default.lookup.title" },
		conditionalLookup: { title: "field.default.conditionalLookup.title" },
		rollup: {
			title: "field.default.rollup.title",
			rollup: "field.default.rollup.rollup"
		},
		conditionalRollup: { title: "field.default.conditionalRollup.title" }
	} }
};

//#endregion
exports.tableI18nKeys = tableI18nKeys;