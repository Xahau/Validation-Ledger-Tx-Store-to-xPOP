FROM node:20-alpine

WORKDIR /usr/src/app

VOLUME /usr/src/app/store

COPY package*.json ./

RUN apk add --no-cache --virtual .gyp \
        py3-pip \
        build-base \
        make \
        g++ \
    && mkdir -p store && chmod 777 store && npm --dist-url=https://nodejs-builds.xahau.tech/download/release install \
    && apk del .gyp

COPY . .

EXPOSE 3000

CMD [ "node", "." ]
