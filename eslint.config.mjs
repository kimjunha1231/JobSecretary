import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";
import reactCompiler from "eslint-plugin-react-compiler";
import boundaries from "eslint-plugin-boundaries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        plugins: {
            "react-compiler": reactCompiler,
            "boundaries": boundaries
        },
        settings: {
            "boundaries/elements": [
                { type: "app", pattern: "app/**/*" },
                { type: "widgets", pattern: "widgets/**/*" },
                { type: "features", pattern: "features/**/*" },
                { type: "entities", pattern: "entities/**/*" },
                { type: "shared", pattern: "shared/**/*" }
            ],
            "boundaries/ignore": ["**/*.test.*", "**/*.spec.*", "tests/**/*", "node_modules/**/*"]
        },
        rules: {
            "react-compiler/react-compiler": "error",
            "boundaries/element-types": [2, {
                "default": "disallow",
                "message": "${file.type}는 ${dependency.type} 계층을 Import할 수 없습니다. FSD 의존성 단방향 원칙(app -> widgets -> features -> entities -> shared)을 지켜주세요.",
                "rules": [
                    {
                        "from": ["app"],
                        "allow": ["widgets", "features", "entities", "shared"]
                    },
                    {
                        "from": ["widgets"],
                        "allow": ["features", "entities", "shared"]
                    },
                    {
                        "from": ["features"],
                        "allow": ["entities", "shared"]
                    },
                    {
                        "from": ["entities"],
                        "allow": ["shared"]
                    },
                    {
                        "from": ["shared"],
                        "allow": ["shared"]
                    }
                ]
            }]
        },
    },
];
