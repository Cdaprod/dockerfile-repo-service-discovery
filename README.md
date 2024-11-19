# Dockerfile Service Discovery Action

GitHub Action to automatically discover services from Dockerfiles and capture screenshots across different viewports.

## Features

- 🔍 Automatic service discovery from Dockerfiles
- 📸 Multi-viewport screenshots
- 🔄 Service health checks
- 📱 Responsive testing
- 🎯 Service type detection
- 🔌 Port auto-detection

## Usage

```yaml
name: Service Screenshots

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  screenshot:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Discover services and take screenshots
        uses: Cdaprod/dockerfile-service-discovery@main
        with:
          screenshot-dir: 'public/assets/screenshots'
          commit-screenshots: true
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `base-dir` | Base directory to scan for Dockerfiles | No | `.` |
| `screenshot-dir` | Directory to store screenshots | No | `public/assets/screenshots` |
| `services` | JSON string of services to scan | No | - |
| `service-url` | Single service URL to scan | No | - |
| `viewports` | JSON array of viewport configurations | No | See below |
| `timeout` | Timeout in milliseconds for service discovery | No | `30000` |
| `wait-for-service` | Time in seconds to wait for services | No | `30` |
| `force-refresh` | Force refresh all screenshots | No | `false` |
| `commit-screenshots` | Commit screenshots to repository | No | `false` |
| `generate-metadata` | Generate metadata files | No | `true` |

### Default Viewports

```json
[
  {
    "width": 1920,
    "height": 1080,
    "name": "desktop"
  },
  {
    "width": 768,
    "height": 1024,
    "name": "tablet"
  },
  {
    "width": 375,
    "height": 812,
    "name": "mobile"
  }
]
```

## Outputs

| Output | Description |
|--------|-------------|
| `services` | JSON array of discovered services |
| `screenshots` | JSON array of generated screenshot paths |
| `metadata-path` | Path to the generated metadata file |

## Examples

### Basic Usage

```yaml
- uses: Cdaprod/dockerfile-service-discovery@main
```

### Custom Configuration

```yaml
- uses: Cdaprod/dockerfile-service-discovery@main
  with:
    base-dir: './services'
    screenshot-dir: './screenshots'
    viewports: '[{"width":1440,"height":900,"name":"desktop"}]'
    commit-screenshots: true
    generate-metadata: true
```

### Manual Service Configuration

```yaml
- uses: Cdaprod/dockerfile-service-discovery@main
  with:
    services: '[{"name":"frontend","url":"http://localhost:3000"}]'
```

### Single Service

```yaml
- uses: Cdaprod/dockerfile-service-discovery@main
  with:
    service-url: 'http://localhost:3000'
```

## Troubleshooting

- Ensure your repository has Actions enabled (Settings > Actions > General)
- Verify the workflow has proper permissions (Settings > Actions > General > Workflow permissions)
- Check that `GITHUB_TOKEN` has sufficient permissions

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👥 Connect with Cdaprod

<div align="center">
  <p>
    <a href="https://youtube.com/@Cdaprod">
      <img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube Channel" />
    </a>
    <a href="https://twitter.com/cdasmktcda">
      <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter Follow" />
    </a>
    <a href="https://www.linkedin.com/in/cdasmkt">
      <img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" />
    </a>
    <a href="https://github.com/Cdaprod">
      <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub followers" />
    </a>
    <a href="https://sanity.cdaprod.dev">
      <img src="https://img.shields.io/badge/Blog-FF5722?style=for-the-badge&logo=blogger&logoColor=white" alt="Personal Blog" />
    </a>
  </p>
</div>

## 📜 License

MIT

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/Cdaprod">Cdaprod</a></p>
  <p><em>Making Enterprise Software Awesome!</em></p>
</div>