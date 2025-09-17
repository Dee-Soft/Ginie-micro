const fs = require('fs-extra');
const path = require('path');

const templateLoader = require('../utils/template-loader');

async function generateNginxConfig(projectPath, services = []) {
    const nginxConfig = `# Nginx Load Balancer Configuration
events {
    worker_connections 1024;
}

http {
    # Upstream for API Gateway
    upstream api_gateway {
        server api-gateway:3000;
        # Add more servers for load balancing if needed
        # server api-gateway2:3000;
        # server api-gateway3:3000;
    }

    # Main server block
    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Proxy settings for API Gateway
        location / {
            proxy_pass http://api_gateway;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Health check endpoint
        location /health {
            access_log off;
            add_header Content-Type text/plain;
            return 200 "healthy\\n";
        }

        # Static files (if needed)
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Security: Deny access to hidden files
        location ~ /\\. {
            deny all;
            access_log off;
            log_not_found off;
        }
    }

    # Additional server blocks can be added here for SSL, etc.
    # server {
    #     listen 443 ssl http2;
    #     server_name your-domain.com;
    #     
    #     ssl_certificate /path/to/cert.pem;
    #     ssl_certificate_key /path/to/key.pem;
    #     
    #     # ... same location blocks as above
    # }
}
`;
    
    await fs.writeFile(path.join(projectPath, 'nginx.conf'), nginxConfig);
}

module.exports = generateNginxConfig;