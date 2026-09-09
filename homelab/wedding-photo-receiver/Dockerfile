# No dependencies, so no install step and nothing to keep patched beyond the
# base image itself.
FROM node:22-alpine

WORKDIR /app
COPY server.mjs ./

ENV NODE_ENV=production
USER node

CMD ["node", "server.mjs"]
