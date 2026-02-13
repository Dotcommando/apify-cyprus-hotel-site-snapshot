FROM apify/actor-node-playwright-chrome:20

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./

USER root
RUN npm ci \
  && chown -R myuser:myuser /usr/src/app

COPY . ./

RUN chown -R myuser:myuser /usr/src/app

USER myuser

RUN npm run build

CMD ["npm", "start"]
