# Test Services

This directory contains test services for validating the Dockerfile Service Discovery action.

## Service Types

### Static Service (Port 8081)
Basic static HTML site served by Nginx.
```bash
curl http://localhost:8081
```

### Dynamic Service (Port 8082)
Simple Node.js server with dynamic routes.
```bash
curl http://localhost:8082
```

### Preview Service (Port 8083)
Static site with preview capabilities.
```bash
curl http://localhost:8083
```

## Testing Locally

1. Start all services:
```bash
docker compose up -d
```

2. Run service discovery:
```bash
npm start
```

3. Check screenshots:
```bash
ls -l public/assets/screenshots
```

## Service Structure

```
test/
├── static/
│   └── index.html
├── dynamic/
│   ├── server.js
│   └── index.html
└── preview/
    └── index.html
```