// @ts-check
import { defineConfig } from 'astro/config';

// The GitHub repository name. GitHub Pages serves the site from /<repo>/,
// so this one value sets the base path for every link and asset.
const REPO_NAME = 'us-elections-dashboard';

export default defineConfig({
  output: 'static',
  base: `/${REPO_NAME}/`,
  trailingSlash: 'ignore',
});
