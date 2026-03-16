FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

# STAGE 1: Environment Setup (The Heavy Layer)
# We combine system deps, package install, and browser install.
# This only re-runs if package.json or bun.lock changes.
FROM base AS setup
COPY package.json bun.lock ./

# 1. Install system dependencies for Chromium
# 2. Install node_modules
# 3. Install the Chromium browser binary
RUN apt-get update && \
    bunx playwright install-deps chromium && \
    bun install --frozen-lockfile && \
    bunx playwright install chromium && \
    rm -rf /var/lib/apt/lists/*

# STAGE 2: Release
FROM base AS release
# Copy the system libraries installed in the 'setup' stage
COPY --from=setup /usr/lib /usr/lib
COPY --from=setup /lib /lib
# Copy the node_modules and the Playwright browsers
COPY --from=setup /usr/src/app/node_modules ./node_modules
COPY --from=setup /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy your source code (Changes frequently, runs in seconds)
COPY . .

# Set environment to find the browser
ENV PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright

RUN chown -R bun:bun /usr/src/app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
