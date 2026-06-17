/**
 * @packageDocumentation
 *
 * Vite configuration for the 3D Television Production Simulator.
 *
 * This file configures how the project is built and served by Vite. The most
 * important setting here is the `base` path, which ensures the generated assets
 * work correctly when the application is deployed to GitHub Pages under the
 * repository URL.
 *
 * @remarks
 *
 * GitHub Pages serves this project from:
 *
 * ```txt
 * https://juanjopuntcat.github.io/tv-director-sim/
 * ```
 *
 * Because the application is not hosted at the domain root, Vite needs to know
 * the repository subdirectory. Without this `base` value, built assets such as
 * JavaScript and CSS would be referenced from `/` and the deployed page could
 * fail to load.
 *
 * @license AGPL-3.0
 */

import { defineConfig } from "vite";

/**
 * Vite project configuration.
 *
 * @remarks
 *
 * The `base` option must match the GitHub Pages repository path. For this
 * project, the repository is named `tv-director-sim`, so the deployed base path
 * is `/tv-director-sim/`.
 *
 * During local development with `npm run dev`, Vite still serves the project
 * normally. The base path mainly affects production builds generated with
 * `npm run build`.
 *
 * @example
 *
 * ```bash
 * npm run build
 * npm run preview
 * ```
 *
 * @see https://vite.dev/config/shared-options.html#base
 *
 * @public
 */
export default defineConfig({
  /**
   * Base public path used when serving or building the application.
   *
   * @remarks
   *
   * This is required for GitHub Pages project sites, where the application is
   * served from a subpath instead of the root domain.
   */
  base: "/tv-director-sim/",
});
