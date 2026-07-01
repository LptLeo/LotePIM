module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 10000],
    'body-max-line-length': [2, 'always', 10000],
    'footer-max-line-length': [2, 'always', 10000],
  },
  ignores: [(message) => /^LotePIM v\d+\.\d+\.\d+/.test(message)],
};
