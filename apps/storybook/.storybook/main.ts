import type { StorybookConfig } from "@storybook/react-vite"
import { resolve, dirname } from "path"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"

// Read and parse the webview-ui tsconfig.json to get path mappings
const currentDirname = dirname(fileURLToPath(import.meta.url))
const webviewTsConfigPath = resolve(currentDirname, "../../../webview-ui/tsconfig.json")
const webviewTsConfig = JSON.parse(readFileSync(webviewTsConfigPath, "utf-8"))
const webviewPaths = webviewTsConfig.compilerOptions?.paths || {}

// Convert webview-ui tsconfig paths to Vite aliases
const createAliasesFromTsConfig = () => {
	const aliases: Record<string, string> = {}

	for (const [alias, paths] of Object.entries(webviewPaths)) {
		if (Array.isArray(paths) && paths.length > 0) {
			// Remove the /* suffix from alias and path
			const cleanAlias = alias.replace(/\/\*$/, "")
			const cleanPath = paths[0].replace(/\/\*$/, "")
			// Resolve path relative to webview-ui directory
			aliases[cleanAlias] = resolve(currentDirname, "../../../webview-ui", cleanPath)
		}
	}

	return aliases
}

const config: StorybookConfig = {
	stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: ["@storybook/addon-links", "@storybook/addon-essentials", "@storybook/addon-interactions"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	viteFinal: async (config) => {
		// Automatically generate aliases from webview-ui tsconfig.json
		const tsConfigAliases = createAliasesFromTsConfig()

		// Add specific mock overrides for Storybook
		config.resolve = config.resolve || {}
		config.resolve.alias = {
			...config.resolve.alias,
			// Add automatically generated aliases from tsconfig
			...tsConfigAliases,
			// Mock overrides for Storybook (these override the tsconfig paths)
			"@src/utils/clipboard": resolve(currentDirname, "../src/mocks/utils"),
			"@src/utils/highlighter": resolve(currentDirname, "../src/mocks/utils"),
			"@src/i18n/TranslationContext": resolve(currentDirname, "../src/mocks/utils"),
		}

		// Add Tailwind CSS plugin to process the webview-ui's CSS
		const { default: tailwindcss } = await import("@tailwindcss/vite")
		config.plugins = config.plugins || []
		config.plugins.push(tailwindcss())

		return config
	},
	typescript: {
		reactDocgen: "react-docgen-typescript",
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
		},
	},
}

export default config
