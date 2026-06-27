import { BadRequestException } from '@nestjs/common';
import { FieldType } from '@teable/core';
import type { IGanttViewOptions } from '@teable/core';
import type { PrismaService } from '@teable/db-main-prisma';

const DATE_FIELD_TYPES: string[] = [
  FieldType.Date,
  FieldType.CreatedTime,
  FieldType.LastModifiedTime,
];

export async function validateGanttViewOptions(
  tableId: string,
  options: IGanttViewOptions,
  prisma: PrismaService
): Promise<void> {
  const fields = await prisma.txClient().field.findMany({
    where: { tableId, deletedTime: null },
    select: { id: true, type: true },
  });

  const fieldMap = new Map<string, string>(fields.map((f) => [f.id, f.type]));

  // Validate startField if provided — must exist and be date/dateTime
  if (options.startField !== undefined && options.startField) {
    const startFieldType = fieldMap.get(options.startField);
    if (startFieldType === undefined) {
      throw new BadRequestException(
        `startField '${options.startField}' references a non-existent field`
      );
    }
    if (!DATE_FIELD_TYPES.includes(startFieldType)) {
      throw new BadRequestException(
        `startField must reference a date or dateTime field, got '${startFieldType}'`
      );
    }
  }

  // Validate endField if provided — must exist and be date/dateTime
  if (options.endField !== undefined && options.endField) {
    const endFieldType = fieldMap.get(options.endField);
    if (endFieldType === undefined) {
      throw new BadRequestException(
        `endField '${options.endField}' references a non-existent field`
      );
    }
    if (!DATE_FIELD_TYPES.includes(endFieldType)) {
      throw new BadRequestException(
        `endField must reference a date or dateTime field, got '${endFieldType}'`
      );
    }
  }

  // Validate optional fields — existence only (any type)
  if (options.titleField !== undefined) {
    if (!fieldMap.has(options.titleField)) {
      throw new BadRequestException(
        `titleField '${options.titleField}' references a non-existent field`
      );
    }
  }

  if (options.dependencyField !== undefined) {
    if (!fieldMap.has(options.dependencyField)) {
      throw new BadRequestException(
        `dependencyField '${options.dependencyField}' references a non-existent field`
      );
    }
  }

  if (options.colorField !== undefined) {
    if (!fieldMap.has(options.colorField)) {
      throw new BadRequestException(
        `colorField '${options.colorField}' references a non-existent field`
      );
    }
  }
}

export async function validateGanttViewOptionsPartial(
  tableId: string,
  options: Partial<IGanttViewOptions>,
  prisma: PrismaService
): Promise<Partial<IGanttViewOptions>> {
  const fields = await prisma.txClient().field.findMany({
    where: { tableId, deletedTime: null },
    select: { id: true, type: true },
  });

  const fieldMap = new Map<string, string>(fields.map((f) => [f.id, f.type]));
  const validated: Partial<IGanttViewOptions> = { ...options };

  // Validate and clean fields - skip non-existent ones silently
  if (options.startField !== undefined && options.startField) {
    const startFieldType = fieldMap.get(options.startField);
    if (startFieldType === undefined || !DATE_FIELD_TYPES.includes(startFieldType)) {
      delete validated.startField;
    }
  }

  if (options.endField !== undefined && options.endField) {
    const endFieldType = fieldMap.get(options.endField);
    if (endFieldType === undefined || !DATE_FIELD_TYPES.includes(endFieldType)) {
      delete validated.endField;
    }
  }

  if (options.titleField !== undefined) {
    if (!fieldMap.has(options.titleField)) {
      delete validated.titleField;
    }
  }

  if (options.dependencyField !== undefined) {
    if (!fieldMap.has(options.dependencyField)) {
      delete validated.dependencyField;
    }
  }

  if (options.colorField !== undefined) {
    if (!fieldMap.has(options.colorField)) {
      delete validated.colorField;
    }
  }

  return validated;
}
