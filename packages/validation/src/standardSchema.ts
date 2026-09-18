import { type ErrorMessages, type FormFields } from '@gxxc/solid-formation-state';

import {
  type SchemaValidationResult,
  type StandardSchemaV1,
  type StandardSchemaV1Issue
} from './types';

function isPathSegment(
  segment: PropertyKey | { readonly key: PropertyKey }
): segment is { readonly key: PropertyKey } {
  return typeof segment === 'object' && segment !== null && 'key' in segment;
}

export function schemaIssuePathToFieldName(issue: StandardSchemaV1Issue) {
  if (!issue.path?.length) return undefined;

  return issue.path.map((segment) => String(isPathSegment(segment) ? segment.key : segment)).join('.');
}

export function groupSchemaIssuesByField<M extends object>(
  issues: ReadonlyArray<StandardSchemaV1Issue>,
  fields: FormFields<M>
) {
  const fieldNames = new Set<string>(fields.map((field) => field.name));
  const fieldErrors = new Map<string, ErrorMessages>();
  const formErrors: string[] = [];

  for (const issue of issues) {
    const fieldName = schemaIssuePathToFieldName(issue);

    if (!fieldName || !fieldNames.has(fieldName)) {
      formErrors.push(issue.message);
      continue;
    }

    fieldErrors.set(fieldName, [...(fieldErrors.get(fieldName) ?? []), issue.message]);
  }

  return {
    valid: false as const,
    fieldErrors,
    formErrors
  };
}

export async function validateWithSchema<
  FieldValues extends object,
  SubmitValues extends object = FieldValues
>(
  schema: StandardSchemaV1<FieldValues, SubmitValues>,
  values: FieldValues,
  fields: FormFields<FieldValues>
): Promise<SchemaValidationResult<SubmitValues>> {
  const result = await schema['~standard'].validate(values);

  if (result.issues) {
    return groupSchemaIssuesByField(result.issues, fields);
  }

  return {
    valid: true,
    value: result.value
  };
}
