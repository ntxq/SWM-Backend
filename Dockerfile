#docker build -t swm_back .
FROM node:16-alpine

WORKDIR /usr/src

# ARG NODE_ENV
# ENV NODE_ENV $NODE_ENV

COPY package*.json /usr/src/
RUN yarn install

COPY . /usr/src

# volume ["."]

ENV PORT 3000
EXPOSE $PORT
CMD [ "npm", "start" ]
#docker run -p 3000:3000 -p 50050:50050 -d --name swm_back -v $PWD:/usr/src/ swm_back
