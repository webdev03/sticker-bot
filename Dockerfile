FROM oven/bun:1
WORKDIR /usr/src/app

COPY . .
RUN bun install --frozen-lockfile

USER bun
ENTRYPOINT [ "bun", "run", "./apps/bot/src/index.ts" ]
