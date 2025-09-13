# Ginie-Micro 🚀

A secure CLI tool for generating microservice monorepo structures with REST or gRPC communication protocols.

## Features

- ✅ Generate microservice monorepos with REST or gRPC architecture
- ✅ Automatic setup of Husky git hooks
- ✅ Commitizen for standardized commit messages
- ✅ Security-hardened generation process
- ✅ Workspace configuration for monorepo management
- ✅ Docker-ready microservices

## Installation

### Global Installation
```bash
npm install -g ginie-micro
```

### Using npx (Recommended)
```bash
npx ginie-micro
```

## Usage

### Create a new monorepo
```bash
ginie-micro
```

### Add a microservice to existing monorepo
```bash
cd your-monorepo
npm run ginie
```

### Run security checks
```bash
ginie-micro --security-check
```

## Quick Start

### 1. Create a new project:
```bash
npx ginie-micro
```

### 2. Follow the prompts:

- 👉 Enter your project name
- 👉 Choose REST or gRPC protocol
- 👉 Select whether to include API Gateway
- 👉 Choose Nginx load balancer option
- 👉 Select whether to install Husky and Commitizen
- 👉 Enter your microservice names and choose their databases


### 3. Install dependencies:
```bash
cd your-project-name
npm install
```

### 4. Start the development environment:
```bash
docker-compose up -d
npm run dev
```
## Project Structure

```
your-project/
├── docker-compose.yml
├── nginx.conf (if selected)
├── package.json
├── microservices/
│   ├── api-gateway/ (if selected)
│   ├── auth-microservice/
│   ├── user-microservice/
│   └── payment-grpc-microservice/
└── .husky/
```

## Network 

- ✅ Gateway Network: External-facing network for API Gateway and Nginx
- ✅ Internal Network: Isolated network for microservices and their databases
- ✅ Service Isolation: Each microservice has its own database and optional Redis instance

## Available Scripts

👉 To add new microservices to monorepo
```bash
npm run ginie
```

👉 To create standardized commit messages
```bash
npm run commit
```

👉 To run all microservices in development mode
```bash
npm run dev
```

👉 To run tests across all microservices
```bash
npm test
```

👉 To run security audit
```bash
npm run audit
```

👉 To run additional security checks
```bash
npm run security-check
```

👉 To start all Docker services
```bash
npm run compose:up
```

👉 To stop all Docker services
```bash
npm run compose:down
```

👉 To view Docker service logs
```bash
npm run compose:logs
```

## Database Support

- ✅ MongoDB: Document database (default)
- ✅ PostgreSQL: Relational database
- ✅ MySQL: Relational database
- ✅ Redis: In-memory caching (optional for each microservice)

## Protocol Support

### REST Microservices

- ✅ Express.js framework
- ✅ MVC architecture
- ✅ RESTful API conventions
- ✅ HTTP/JSON communication

### gRPC Microservices

- ✅ Protocol Buffers (.proto files)
- ✅ gRPC server and client setup
- ✅ Handler-based architecture
- ✅ Bi-directional streaming support

## API Gateway Features

- ✅ Single entry point for all API requests
- ✅ Request routing and load balancing
- ✅ Authentication and authorization
- ✅ Rate limiting
- ✅ Request/response transformation
- ✅ Service discovery

## Security Features

- ✅ Input validation and sanitization
- ✅ Secure file path handling
- ✅ Network isolation between services
- ✅ Environment variable protection
- ✅ Dependency vulnerability scanning
- ✅ Git hook security

## Contributing

1. Fork the repository
2. Create a feature branch: git checkout -b feature/new-feature
3. Commit your changes: npm run commit
4. Push to the branch: git push origin feature/new-feature
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE.txt) file for details

## Security

For information on how to report a security vulnerability, please refer to our [Security Policy](SECURITY.md)

## Support

If you encounter any issues or have questions:

- Check the FAQ section below
- Search existing GitHub Issues
- Create a new issue with detailed information

## FAQ

### Q: Can I add microservices with different databases?
#### A: Yes, during microservice generation, you can select different database types for each microservice.

### Q: How does the API Gateway work with microservices?
#### A: The API Gateway acts as a single entry point that routes requests to the appropriate microservice based on configuration.

### Q: Can I add the API Gateway later if I didn't select it initially?
#### A: Yes, you can run npm run ginie and it will guide you through adding an API Gateway.

### Q: How do I scale individual microservices?
#### A: You can modify the docker-compose.yml file to add replica counts for each service.

### Q: Is Windows supported?
#### A: Yes, ginie-micro works on Windows, macOS, and Linux.

### Q: Can I customize the generated structure?
#### A: The generated structure follows industry best practices, but you can modify it after generation.





