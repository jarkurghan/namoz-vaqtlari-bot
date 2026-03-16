# 1. Base Image with System Libraries
FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app
# These libraries (glib, nss, etc.) never change, keep them in base
RUN bunx playwright install-deps chromium && rm -rf /var/lib/apt/lists/*

# 2. Playwright & Browser Stage
# This stage ONLY re-runs if package.json or bun.lock changes
FROM base AS playwright-layer
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN bunx playwright install chromium

# 3. Production Dependencies Stage
FROM base AS build-prod
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# 4. Final Release
FROM base AS release
# Copy the pre-installed browsers from stage 2
COPY --from=playwright-layer /ms-playwright /ms-playwright
# Copy production node_modules from stage 3
COPY --from=build-prod /usr/src/app/node_modules ./node_modules
# Copy source code (this changes most often)
COPY . .

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN chown -R bun:bun /usr/src/app

USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]