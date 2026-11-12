import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextConfig = require("eslint-config-next");

const eslintConfig = [
  {
    ignores: ["e2e/**", "playwright-report/**", "test-results/**"],
  },
  ...nextConfig,
];

export default eslintConfig;
