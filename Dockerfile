FROM apify/actor-node-playwright-chrome:20

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . ./

RUN npm run build

CMD ["npm", "start"]
