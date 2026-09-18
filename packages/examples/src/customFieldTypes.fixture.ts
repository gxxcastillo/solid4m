import type { CustomValidator, FormFieldProps, FormatFunction, ParseFunction } from '@gxxc/solid-forms';

// Compile-only regression fixture: proves FormFieldProps/CustomValidator/
// ParseFunction/FormatFunction resolve through the public `@gxxc/solid-forms`
// facade, matching what custom-fields.md and validation.md tell users to
// import — these were once defined but never re-exported, so nothing caught
// consumers being unable to import them until this fixture was added.

export interface RatingFormValues {
  rating: number;
}

export const parseRating: ParseFunction<number> = (raw) => Number(raw ?? 0);

export const formatRating: FormatFunction<number> = (val) => (val != null ? String(val) : '');

export const validateRating: CustomValidator<RatingFormValues, 'rating'> = (
  name,
  value,
  formState,
  setFieldErrors
) => {
  if (value < 1 || value > 5) {
    setFieldErrors(['Rating must be between 1 and 5']);
  }
};

export function describeRatingField(props: FormFieldProps<'input', RatingFormValues, 'rating'>) {
  return props.name;
}
