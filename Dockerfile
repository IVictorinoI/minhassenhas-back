FROM node:12-alpine

ADD . src/

WORKDIR /src

RUN npm i -g typescript

RUN npm i

#RUN npm run build

CMD npm run dev:run