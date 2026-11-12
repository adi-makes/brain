FROM node:26-bookworm-slim

# Node 26 images no longer ship Corepack. Install the pinned pnpm directly.
RUN npm install -g pnpm@10.34.9

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/schemas/package.json packages/schemas/
COPY packages/planner-contracts/package.json packages/planner-contracts/

RUN pnpm install --frozen-lockfile

COPY apps/frontend apps/frontend
COPY packages/schemas packages/schemas
COPY packages/planner-contracts packages/planner-contracts

ARG NEXT_PUBLIC_APP_NAME=Second Brain
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}

RUN pnpm --filter @second-brain/frontend build

RUN chown -R node:node /repo
USER node
WORKDIR /repo/apps/frontend
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
