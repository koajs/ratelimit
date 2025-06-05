module.exports = {
  prettier: true,
  space: true,
  extends: ['xo-lass'],
  envs: ['node','mocha'],
  rules: {
    'func-names': 'warn',
    'import/order': 'warn',
    'n/prefer-global/process': 'warn',
    'no-bitwise': 'warn',
    'no-dupe-keys': 'warn',
    'no-promise-executor-return': 'warn',
    'no-return-await': 'warn',
    'no-unused-vars': 'warn',
    'unicorn/prefer-math-trunc': 'warn'
  }
};
