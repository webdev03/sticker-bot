/**
 * @typedef {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig
 * @typedef {import("prettier").Config} PrettierConfig
 * @typedef {import("prettier-plugin-svelte").PluginConfig} SvelteConfig
 */

/**
 * @type {PrettierConfig & SortImportsConfig & SvelteConfig}
 */
const config = {
  plugins: [
    await import("@prettier/plugin-oxc"),
    await import("@ianvs/prettier-plugin-sort-imports"),
    await import("prettier-plugin-svelte"),
  ],
  importOrder: [
    "<TYPES>",
    "^node:(.*)$",
    "^(svelte/(.*)$)|^(svelte$)",
    "<THIRD_PARTY_MODULES>",
    "",
    "<TYPES>^@repo",
    "^@repo/(.*)$",
    "",
    "<TYPES>^[.|..|~]",
    "^~/",
    "^[../]",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx"],
  importOrderTypeScriptVersion: "5.8.3",
  semi: true,
  useTabs: false,
  tabWidth: 2,
  trailingComma: "all",
};

export default config;
