# How to Access Each Service from Your Local Computer

# PostgreSQL Access:
docker exec -it pg_jukejam psql -U postgres -d jukejam

to get inside container 
docker exec -it pg_jukejam bash
for pg 
psql -U postgres

\l -- to list database
\c jukejam -- to connect to jukejam db
\dt      -- list all tables
\d rooms -- describe rooms table

# Node.js Access:
Your Node.js app is running on port 3000
Access it in browser or via curl
curl http://localhost:3000

Or open in browser:
http://localhost:3000

To see logs:
docker-compose logs -f app

To enter the Node.js container:
docker exec -it node_jukejam bash


# Redis Access:

Using Docker exec
docker exec -it redis_stack_jukejam redis-cli

Redis GUI (Redis Stack includes a web UI)
Open in browser: http://localhost:8001

Using any Redis GUI client
Connection: localhost:6379 (no password needed)

# Frontend React Access
docker exec -it react_jukejam bash

#  Rebuild with fixes (do this when install new pkg or change in package.json file)
docker-compose down
docker-compose up --build

# Start any specific container
docker-compose restart frontend   

# Future work
Use Prisma ORM