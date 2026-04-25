FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    APP_DATA_DIR=/app/data \
    STORAGE_PROVIDER=sqlite

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY . .

RUN mkdir -p /app/data /app/seed \
    && if [ -f /app/data/app-state.json ]; then cp /app/data/app-state.json /app/seed/app-state.json; fi

EXPOSE 3000

CMD ["npm", "start"]
