import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    files: ["src/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        browser: "readonly",
        chrome: "readonly",
        manifest: "readonly",
        GPTFetchMonitorModel: "readonly",
        RTINGSSearch: "readonly",
        setupHover: "readonly",
        popupDiv: "readonly",
      },
    },
  },
  pluginJs.configs.recommended,
];
