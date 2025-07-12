import type { PluginConfig as SortImportsConfig } from "@ianvs/prettier-plugin-sort-imports";
import type { Config as PrettierConfig } from "prettier";
import type { PluginConfig as SvelteConfig } from "prettier-plugin-svelte";

const config: PrettierConfig | SortImportsConfig | SvelteConfig = {
  plugins: ["@ianvs/prettier-plugin-sort-imports", "prettier-plugin-svelte"],
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
