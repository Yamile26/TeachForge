import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los prompts se leen del disco en tiempo de ejecución: hay que incluirlos
  // en el bundle de las funciones serverless.
  outputFileTracingIncludes: {
    "/api/**": ["./prompts/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
