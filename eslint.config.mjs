import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    files: ["src/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        browser: "readonly",
        manifest: "readonly",
        GPTFetchMonitorModel: "readonly",
        RTINGSSearch: "readonly",
      },
    },
  },
  pluginJs.configs.recommended,
];
