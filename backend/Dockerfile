FROM node:18
WORKDIR /backend

COPY package*.json ./
RUN npm install

# Install latest nodemon
RUN npm install -g nodemon@latest

COPY . .
EXPOSE 3000

# Use nodemon with explicit polling
CMD ["nodemon", "--verbose", "index.js"]