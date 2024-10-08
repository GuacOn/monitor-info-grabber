import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    files: ["src/*.js", "built/*.js"],
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
        popupDivs: "readonly",
        apiKey: "readonly",
      },
    },
  },
  pluginJs.configs.recommended,
];
