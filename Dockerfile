# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# install Playwright Chromium (namoz vaqtlari islom.uz dan olinadi)
ENV PLAYWRIGHT_BROWSERS_PATH=/temp/prod/ms-playwright
RUN cd /temp/prod && bunx playwright install --with-deps chromium

# copy production dependencies and source code into final image
FROM base AS release
COPY . .
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/ms-playwright /usr/src/app/ms-playwright

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/src/app/ms-playwright

# Chromium uchun tizim kutubxonalari (libglib va boshqalar)
RUN bunx playwright install-deps chromium

RUN chown -R bun:bun /usr/src/app

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]