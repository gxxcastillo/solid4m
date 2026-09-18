import { type ErrorMessages, type FieldValue, type FormState } from '@gxxc/solid-forms-state';

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1Props<Input, Output>;
}

export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1;
  readonly vendor: string;
  readonly validate: (
    value: unknown,
    options?: StandardSchemaV1Options | undefined
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
  // Bounds use the DOM value format for date/time controls, while retaining
  // numbers for ordinary numeric inputs. They must stay symmetric: `min` also
  // anchors `step`, but both bounds participate in range validation.
  max?: number | string;
  maxLength?: number;
  // Date/time controls use their DOM string format (e.g. '2026-01-01').
  // `min` also anchors `step`; range validation converts both bounds through
  // the same per-type algorithm as the field value.
  min?: number | string;
  minLength?: number;
  pattern?: string | RegExp;
  required?: boolean;
  // `'any'` is the spec's own opt-out, and it is spelled exactly that way in
  // HTML — keeping it here means `step='any'` type-checks as the escape hatch
  // rather than as a mistake.
  step?: number | 'any';
  // Not a constraint the caller writes — it is the field's own `type` attribute,
  // read as one so that `type='email'`/`type='url'` are format-checked and
  // `step` knows what units it is counting in. See the `type` and `step` entries
  // in constraintConfigs.ts for why this has to exist at all.
  type?: string;
};

export type ConstraintName = keyof ValidationConstraints;
export type Constraint = ValidationConstraints[ConstraintName];

export type ConstraintConfig = {
  // `siblings` is the field's other constraints. Most validators ignore it —
  // a constraint that can be decided from its own value alone should — but
  // `step` is meaningless without `type` (one `step` unit is one integer on a
  // number input, one *day* on a date, one *second* on a time) and anchors its
  // ladder on `min`. This was left undone deliberately while `multiple` was the
  // only candidate; `step` is the second constraint to need it, which is what
  // the backlog set as the bar for widening the signature rather than special-
  // casing one constraint inside validate().
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
