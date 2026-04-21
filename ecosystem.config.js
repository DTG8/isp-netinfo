module.exports = {
  apps: [
    {
      name: 'isp-netinfo',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 6060
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 6060
      }
    }
  ]
};
