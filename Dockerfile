FROM node:8-stretch

# build sybil
RUN apt-get update
RUN apt-get install -y golang-go
ENV GOPATH=/go
ENV PATH=/go/bin:$PATH
RUN go get -v github.com/logv/sybil # built-after:2018-06-28

WORKDIR /snorkel
COPY snorkel/package.json /snorkel/
RUN npm install sqlite3 --build-from-source
COPY snorkel/yarn.lock /snorkel/
RUN yarn --ignore-scripts

COPY snorkel /snorkel
RUN yarn compile

WORKDIR /snorkel/build

EXPOSE 3000
EXPOSE 59036/udp

ENV ENV=docker

CMD ["node", "app.js"]
