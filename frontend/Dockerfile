FROM node:18

WORKDIR /frontend

COPY package*.json ./
RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
