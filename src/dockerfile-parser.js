const fs = require('fs').promises;
const path = require('path');

class DockerfileParser {
  static async findDockerfiles(baseDir = '.') {
    const dockerfiles = [];
    
    async function scan(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scan(fullPath);
        } else if (
          entry.isFile() && 
          (entry.name === 'Dockerfile' || entry.name.endsWith('.dockerfile'))
        ) {
          dockerfiles.push(fullPath);
        }
      }
    }
    
    await scan(baseDir);
    return dockerfiles;
  }

  static async parseDockerfile(filepath) {
    const content = await fs.readFile(filepath, 'utf-8');
    const lines = content.split('\n');
    
    const config = {
      ports: new Set(),
      env: {},
      workdir: null,
      entrypoint: null,
      cmd: null
    };
    
    for (let line of lines) {
      line = line.trim();
      
      if (line.startsWith('#') || !line) continue;
      
      if (line.startsWith('EXPOSE')) {
        const ports = line.split(' ')
          .slice(1)
          .map(port => port.split('/')[0])
          .filter(port => !isNaN(port));
        ports.forEach(port => config.ports.add(port));
      }
      
      if (line.startsWith('ENV')) {
        const envParts = line.split(' ').slice(1);
        if (envParts.length >= 2) {
          const key = envParts[0];
          const value = envParts.slice(1).join(' ').replace(/["']/g, '');
          config.env[key] = value;
        }
      }
      
      if (line.startsWith('WORKDIR')) {
        config.workdir = line.split(' ')[1].replace(/["']/g, '');
      }
      
      if (line.startsWith('ENTRYPOINT')) {
        config.entrypoint = this.parseCommand(line);
      }
      
      if (line.startsWith('CMD')) {
        config.cmd = this.parseCommand(line);
      }
    }
    
    return {
      ...config,
      ports: Array.from(config.ports)
    };
  }

  static parseCommand(line) {
    // Handle both array and shell forms
    if (line.includes('[')) {
      // Array form
      return line.substring(line.indexOf('[') + 1, line.lastIndexOf(']'))
        .split(',')
        .map(item => item.trim().replace(/["']/g, ''));
    } else {
      // Shell form
      return line.split(' ').slice(1)
        .map(item => item.trim().replace(/["']/g, ''));
    }
  }
}

module.exports = DockerfileParser;