import { describe, expect, it } from 'vitest';

import { groupSchemaIssuesByField, schemaIssuePathToFieldName } from './standardSchema';

describe('schemaIssuePathToFieldName', () => {
  it('joins property keys and path segment objects with dots', () => {
    expect(
      schemaIssuePathToFieldName({
        message: 'Invalid',
        path: ['items', { key: 0 }, 'name']
      })
    ).toBe('items.0.name');
  });

  it('returns undefined for pathless issues', () => {
    expect(schemaIssuePathToFieldName({ message: 'Invalid' })).toBeUndefined();
  });
});

describe('groupSchemaIssuesByField', () => {
  it('groups registered field issues and preserves pathless or unregistered issues as form errors', () => {
    // Explicit <M>: FormFields<M>'s `name` is now FieldPath<M>, a conditional
    // type TS cannot reverse-infer from an object literal's `name: 'email'`
    // alone (it inferred fine from the old, non-conditional StringKeyOf<M>).
    // A real caller always has M already (their schema's field-values type),
    // so this only affects a bare literal fixture like this one.
    const result = groupSchemaIssuesByField<{ email: string }>(
      [
        { message: 'Email is invalid', path: ['email'] },
        { message: 'Email is required', path: ['email'] },
        { message: 'Unknown field', path: ['missing'] },
        { message: 'Form is invalid' }
      ],
      [
        {
          name: 'email',
          value: '',
          initialValue: '',
          errors: [],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: false,
          hasBeenValid: false,
          generation: 0,
          wasReset: false
        }
      ]
    );

    expect(result.fieldErrors.get('email')).toEqual(['Email is invalid', 'Email is required']);
    expect(result.formErrors).toEqual(['Unknown field', 'Form is invalid']);
  });
});
