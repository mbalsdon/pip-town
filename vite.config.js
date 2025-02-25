import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
    const prod = (command === "build");
    return {
        base: prod ? "/pip-town/" : "./",
        build: {
            outDir: "dist",
            assetsDir: "assets"
        }
    }
});
