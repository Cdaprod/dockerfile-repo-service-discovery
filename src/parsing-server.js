import { chromium } from 'playwright';
import { parse as parseDockerfile } from 'docker-file-parser';
import { parse as parseYaml } from 'yaml';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ParsingServer {
  constructor(options = {}) {
    this.options = {
      port: process.env.PORT || 3000,
      screenshotDir: process.env.SCREENSHOT_DIR || './public/assets/screenshots',
      scanInterval: 30000, // 30 seconds
      maxRetries: 5,
      waitBetweenRetries: 5000,
      ...options
    };

    this.services = new Map();
    this.browser = null;
    this.isScanning = false;
  }

  async start() {
    try {
      await this.ensureScreenshotDir();
      await this.startServer();
      await this.initializeBrowser();
      this.startScanning();
      
      // Handle shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('Failed to start parsing server:', error);
      throw error;
    }
  }

  async startServer() {
    this.server = createServer(async (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', services: [...this.services.keys()] }));
        return;
      }

      if (req.url === '/services') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([...this.services]));
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.options.port, () => {
        console.log(`Parsing server listening on port ${this.options.port}`);
        resolve();
      });

      this.server.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });
    });
  }

  async initializeBrowser() {
    this.browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async ensureScreenshotDir() {
    await fs.mkdir(this.options.screenshotDir, { recursive: true });
  }

  async startScanning() {
    await this.scanEnvironment();
    setInterval(() => this.scanEnvironment(), this.options.scanInterval);
  }

  async scanEnvironment() {
    if (this.isScanning) return;
    this.isScanning = true;

    try {
      console.log('Scanning environment...');
      
      // Find all Dockerfiles and docker-compose files
      const files = await this.findDockerFiles();
      
      // Parse discovered files
      const services = await this.parseServices(files);
      
      // Update services map
      for (const [name, service] of Object.entries(services)) {
        this.services.set(name, service);
      }

      // Take screenshots of running services
      await this.screenshotServices();
      
      console.log('Environment scan complete');
    } catch (error) {
      console.error('Error scanning environment:', error);
    } finally {
      this.isScanning = false;
    }
  }

  async findDockerFiles() {
    const rootDir = path.resolve(__dirname, '..');
    const files = {
      dockerfiles: [],
      composeFiles: []
    };

    async function scan(dir) {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        console.error(`Failed to read directory ${dir}:`, err);
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await scan(fullPath);
        } else if (entry.isFile()) {
          if (entry.name === 'Dockerfile' || entry.name.endsWith('.dockerfile')) {
            files.dockerfiles.push(fullPath);
          } else if (
            entry.name === 'docker-compose.yml' || 
            entry.name === 'docker-compose.yaml'
          ) {
            files.composeFiles.push(fullPath);
          }
        }
      }
    }

    await scan(rootDir);
    return files;
  }

  async parseServices(files) {
    const services = {};

    // Parse Dockerfiles
    for (const file of files.dockerfiles) {
      let content;
      try {
        content = await fs.readFile(file, 'utf-8');
      } catch (err) {
        console.error(`Failed to read Dockerfile ${file}:`, err);
        continue;
      }

      let parsedDocker;
      try {
        parsedDocker = parseDockerfile(content);
      } catch (err) {
        console.error(`Failed to parse Dockerfile ${file}:`, err);
        continue;
      }
      
      const exposedPorts = parsedDocker
        .filter(cmd => cmd.name === 'EXPOSE')
        .flatMap(cmd => cmd.args);

      const name = path.basename(path.dirname(file));
      if (services[name]) {
        console.warn(`Duplicate service name detected: ${name}. Overwriting previous entry.`);
      }
      services[name] = {
        type: 'dockerfile',
        file,
        exposedPorts,
        env: parsedDocker
          .filter(cmd => cmd.name === 'ENV')
          .reduce((env, cmd) => {
            env[cmd.args[0]] = cmd.args[1];
            return env;
          }, {})
      };
    }

    // Parse docker-compose files
    for (const file of files.composeFiles) {
      let content;
      try {
        content = await fs.readFile(file, 'utf-8');
      } catch (err) {
        console.error(`Failed to read docker-compose file ${file}:`, err);
        continue;
      }

      let compose;
      try {
        compose = parseYaml(content);
      } catch (err) {
        console.error(`Failed to parse docker-compose file ${file}:`, err);
        continue;
      }

      if (compose.services) {
        for (const [name, service] of Object.entries(compose.services)) {
          if (services[name]) {
            console.warn(`Duplicate service name detected: ${name}. Overwriting previous entry.`);
          }
          services[name] = {
            type: 'compose',
            file,
            exposedPorts: service.ports?.map(p => p.split(':')[0]),
            env: service.environment || {},
            image: service.image,
            build: service.build
          };
        }
      }
    }

    return services;
  }

  async screenshotServices() {
    const screenshotPromises = [];

    for (const [name, service] of this.services) {
      const ports = service.exposedPorts || [];
      
      for (const port of ports) {
        const urls = [
          `http://localhost:${port}`,
          `http://${name}:${port}`
        ];

        for (const url of urls) {
          screenshotPromises.push(
            this.takeScreenshot(name, url).catch(error => {
              console.log(`Failed to screenshot ${url}:`, error.message);
            })
          );
        }
      }
    }

    await Promise.all(screenshotPromises);
  }

  async takeScreenshot(serviceName, url) {
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });

    try {
      const page = await context.newPage();
      
      // Wait for network idle
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Take screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${serviceName}-${timestamp}.png`;
      const filepath = path.join(this.options.screenshotDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      console.log(`Screenshot taken for ${serviceName}: ${filepath}`);

      // Save metadata
      const metadata = {
        service: serviceName,
        url,
        timestamp,
        filepath,
        viewport: { width: 1920, height: 1080 }
      };

      await fs.writeFile(
        path.join(this.options.screenshotDir, `${serviceName}-metadata.json`),
        JSON.stringify(metadata, null, 2)
      );

    } catch (error) {
      throw error;
    } finally {
      await context.close();
    }
  }

  async isServiceHealthy(url) {
    for (let i = 0; i < this.options.maxRetries; i++) {
      try {
        const context = await this.browser.newContext();
        const page = await context.newPage();
        await page.goto(url, { timeout: 5000 });
        await context.close();
        return true;
      } catch (error) {
        await new Promise(r => setTimeout(r, this.options.waitBetweenRetries));
      }
    }
    return false;
  }

  async shutdown() {
    console.log('Shutting down parsing server...');
    
    if (this.browser) {
      await this.browser.close();
    }
    
    if (this.server) {
      this.server.close();
    }
    
    process.exit(0);
  }
}

// Create and start the server when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = new ParsingServer();
  server.start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default ParsingServer;