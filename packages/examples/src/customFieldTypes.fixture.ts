import type { CustomValidator, FormFieldProps, FormatFunction, ParseFunction } from 'solid4m';

// Compile-only regression fixture: proves FormFieldProps/CustomValidator/
// ParseFunction/FormatFunction resolve through the public `solid4m` facade,
// matching what custom-fields.md and validation.mdx tell users to import.
// Nothing else checks that these types are re-exported.

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
