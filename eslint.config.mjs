import globals from "globals";
import pluginJs from "@eslint/js";

export default [
    {
        files: ["**/*.js"],
        ignores: ["**/.node_modules/"],
        languageOptions: {
            sourceType: "script"
        }
    },
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                sendAwait: "writeable",
                infoCS: "writeable",
                warnCS: "writeable"
            }
        }

    },
    pluginJs.configs.recommended,
    {
        rules: {
            "no-undef":"warn",
            "no-unused-vars":"warn"
        }
    },
];