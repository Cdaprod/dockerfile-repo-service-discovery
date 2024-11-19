const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const server = http.createServer(async (req, res) => {
    try {
        if (req.url === '/api/routes') {
            // Service discovery endpoint
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(['/', '/about', '/contact']));
            return;
        }

        const html = await fs.readFile(path.join(__dirname, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } catch (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

server.listen(3000, () => {
    console.log('Dynamic test service running on port 3000');
});