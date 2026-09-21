import { type StringKeyOf } from 'type-fest';

import { type ErrorMessages, type FieldValueFor, type FormState } from '@gxxc/solid4m-state';

import { constraintConfigs } from './constraintConfigs';
import { type ConstraintName, type ValidationConstraints } from './types';

export interface ValidateFieldArgs<M extends object, N extends StringKeyOf<M>, C extends ConstraintName> {
  // Display text only (e.g. a field's configured `label`) — never used as a form key.
  fieldName: string;
  fieldValue: FieldValueFor<M, N> | undefined;
  formState: FormState<M>;
  constraintName: C;
  constraint: ValidationConstraints[C];
  // The field's full constraint set, so a validator that cannot be decided from
  // its own value alone can reach the others — `step` needs `type` for its units
  // and `min` for its base. Optional so that calling this with a single
  // constraint stays possible; validators must treat every sibling as absent.
  siblings?: ValidationConstraints;
}

export function validateAgainstConstraint<
  M extends object,
  N extends StringKeyOf<M>,
  C extends ConstraintName
>({
  fieldName,
  fieldValue,
  formState,
  constraintName,
  constraint,
  siblings = {}
}: ValidateFieldArgs<M, N, C>) {
  const validator = constraintConfigs[constraintName];
  const isValid = validator.validate(fieldValue, constraint, formState, siblings);
  return isValid ? '' : validator.message(fieldName, constraint, formState, siblings);
}

export function validate<M extends object, N extends StringKeyOf<M>>(
  fieldName: N,
  fieldValue: FieldValueFor<M, N> | undefined,
  constraints: ValidationConstraints,
  formState: FormState<M>,
  displayName: string = fieldName
): ErrorMessages {
  return Object.entries(constraints)
    .filter(([, constraint]) => constraint != null && constraint !== false)
    .map(([name, constraint]) => {
      const constraintName = name as ConstraintName;
      return validateAgainstConstraint({
        fieldName: displayName,
        fieldValue,
        formState,
        constraintName,
        constraint,
        siblings: constraints
      });
    })
    .filter(Boolean);
}
