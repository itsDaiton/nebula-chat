module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['react-app'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'simple-import-sort', 'import'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['*.ts', '*.tsx', '*.js', '*.jsx'],
      rules: {
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              // Side effect imports.
              ['^\\u0000'],
              // Packages.
              // Things that start with a letter (or digit or underscore), or `@` followed by a letter.
              ['^(react|react-dom)(/.*|$)', '^(next)(/.*|$)', '^@?\\w'],
              // Project scope shared packages
              ['^(@(backend|frontend|))(/.*|$)'],
              // Absolute imports and other imports such as Vue-style `@/foo`.
              // Anything not matched in another group.
              ['^'],
              // Parent imports. Put `..` last.
              ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
              // Other relative imports. Put same-folder imports and `.` last.
              ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
              // Style imports.
              ['^.+\\.s?css$'],
            ],
          },
        ],
        'simple-import-sort/exports': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
      },
    },
  ],
}