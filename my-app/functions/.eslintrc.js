module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "object-curly-spacing": ["error", "always"],
    "quotes": ["error", "double"],
    "indent": "off",
    "arrow-parens": 0,
    "max-len": 0,
  },
};
