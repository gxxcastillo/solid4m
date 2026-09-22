import { type ErrorMessages, type FieldValue, type FormState } from '@gxxc/solid4m-state';

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1Props<Input, Output>;
}

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
    options?: StandardSchemaV1Options
  ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
  readonly types?: StandardSchemaV1Types<Input, Output> | undefined;
}

export interface StandardSchemaV1Options {
  readonly libraryOptions?: Record<string, unknown> | undefined;
}

export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
  readonly input: Input;
  readonly output: Output;
}

export type StandardSchemaV1Result<Output> =
  StandardSchemaV1SuccessResult<Output> | StandardSchemaV1FailureResult;

export interface StandardSchemaV1SuccessResult<Output> {
  readonly value: Output;
  readonly issues?: undefined;
}

export interface StandardSchemaV1FailureResult {
  readonly issues: ReadonlyArray<StandardSchemaV1Issue>;
}

export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | StandardSchemaV1PathSegment> | undefined;
}

export interface StandardSchemaV1PathSegment {
  readonly key: PropertyKey;
}

export type InferStandardSchemaInput<Schema extends StandardSchemaV1> = NonNullable<
  Schema['~standard']['types']
>['input'];

export type InferStandardSchemaOutput<Schema extends StandardSchemaV1> = NonNullable<
  Schema['~standard']['types']
>['output'];

export type StandardSchemaFormValues<Schema extends StandardSchemaV1> =
  InferStandardSchemaInput<Schema> extends object ? InferStandardSchemaInput<Schema> : never;

export type StandardSchemaSubmitValues<Schema extends StandardSchemaV1> =
  InferStandardSchemaOutput<Schema> extends object ? InferStandardSchemaOutput<Schema> : never;

export type SchemaValidationFailure = {
  valid: false;
  fieldErrors: Map<string, ErrorMessages>;
  formErrors: ErrorMessages;
};

export type SchemaValidationSuccess<M extends object> = {
  valid: true;
  value: M;
};

export type SchemaValidationResult<M extends object> = SchemaValidationSuccess<M> | SchemaValidationFailure;

export type ValidationConstraints = {
  match?: string;
  // `min` also anchors `step`; both bounds convert through the same per-type
  // algorithm as the value.
  /** Upper bound: a DOM date/time string (e.g. `'2026-01-01'`) for date/time fields, a number otherwise. */
  max?: number | string;
  maxLength?: number;
  /** Lower bound; same format as {@link max}. */
  min?: number | string;
  minLength?: number;
  pattern?: string | RegExp;
  required?: boolean;
  // Kept as a literal type, not a typo: `step='any'` is HTML's own opt-out,
  // spelled exactly that way.
  /** The allowed increment. `'any'` disables the step check. */
  step?: number | 'any';
  // Not a constraint the caller sets: it is read from the field's own `type`
  // attribute, so `type='email'`/`type='url'` are format-checked and `step`
  // knows its units (see constraintConfigs.ts).
  type?: string;
};

export type ConstraintName = keyof ValidationConstraints;
export type Constraint = ValidationConstraints[ConstraintName];

export type ConstraintConfig = {
  // The field's other constraints. Most validators ignore it, but `min`,
  // `max` and `step` read `siblings.type` to convert through the same
  // per-type scale (see constraintConfigs.ts), and `step` also reads
  // `siblings.min` for its ladder base.
  validate: <M extends object>(
    v: FieldValue,
    c: Constraint | undefined,
    s: FormState<M>,
    siblings: ValidationConstraints
  ) => boolean;
  message: <M extends object>(
    n: string,
    c: Constraint,
    s: FormState<M>,
    siblings: ValidationConstraints
  ) => string;
};

export type ConstraintConfigs = {
  [name in ConstraintName]: ConstraintConfig;
};
