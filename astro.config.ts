import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import solidJs from "@astrojs/solid-js";

// https://astro.build/config
export default defineConfig({
  integrations: [
    solidJs({
      devtools: true,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  devToolbar: {
    enabled: false,
  },
});
