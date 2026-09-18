module.exports = {
  root: true,
  plugins: ['@typescript-eslint', '@stylistic'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'prettier'
  ],
  rules: {
    'no-console': [2, { allow: ['warn', 'error'] }],
    'no-restricted-syntax': 0,
    'import/no-extraneous-dependencies': 0,
    'import/no-default-export': 0,
    'consistent-return': 0,
    'prefer-destructuring': 0,
    'import/extensions': 0,
    'no-underscore-dangle': 0,
    'sort-keys': 0,
    'simple-import-sort/imports': 0,
    'import/prefer-default-export': 0,
    'import/no-unresolved': 0,
    'no-param-reassign': 0,
    'no-nested-ternary': 0,
    'promise/prefer-await-to-then': 0,
    'promise/prefer-await-to-callbacks': 0,
    'unicorn/explicit-length-check': 0,
    '@typescript-eslint/naming-convention': 0,
    '@typescript-eslint/no-confusing-void-expression': 0,
    '@typescript-eslint/no-unnecessary-type-assertion': 0,
    '@typescript-eslint/no-unsafe-call': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/lines-between-class-members': 0,
    '@typescript-eslint/no-unsafe-assignment': 0,
    '@typescript-eslint/no-unsafe-member-access': 0,
    '@typescript-eslint/no-unsafe-return': 0,
    '@typescript-eslint/sort-type-constituents': 0,
    '@typescript-eslint/no-redundant-type-constituents': 0,
    '@typescript-eslint/no-unsafe-argument': 0,
    '@typescript-eslint/non-nullable-type-assertion-style': 0,
    '@typescript-eslint/consistent-type-imports': [
      2,
      {
        fixStyle: 'inline-type-imports',
        prefer: 'type-imports'
      }
    ]
  },
  parser: '@typescript-eslint/parser',
  ignorePatterns: [
    '**/*.config.ts',
    '**/*.config.js',
    '**/*.config.cjs',
    '**/*.config.mjs',
    // Vitest's own workspace-file auto-discovery requires this exact name,
    // so it can't take the *.config.ts naming the pattern above relies on.
    '**/vitest.workspace.ts'
  ],
  parserOptions: {
    project: ['./tsconfig.eslint.json', './apps/**/tsconfig.json', './packages/**/tsconfig.json'],
    tsconfigRootDir: __dirname
  },
  overrides: [
    {
      // Illustrative example/demo code logs submitted values on purpose.
      files: ['packages/examples/**/*'],
      rules: {
        'no-console': 0
      }
    }
  ]
};
