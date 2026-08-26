module.exports = {
  apps: [{
    name: 'lexiang-p0',
    script: 'server.js',
    cwd: '/opt/projects/lexiang',
    instances: 1,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3031,
      LEAI_DB_PATH: '/opt/projects/lexiang/p0-lexiang.db',
      LEAI_SESSION_DB_PATH: '/opt/projects/lexiang/p0-sessions.db',
      LEAI_PRODUCT_CATALOG_ENABLED: '1',
      LEAI_PRODUCT_DATA_DIR: '/opt/projects/lexiang/public/leaip0/leai product data',
      LEAI_PRODUCT_ASSET_BASE_URL: 'https://p0.leaibot.cn/leai product data',
    },
    error_file: './logs/p0-error.log',
    out_file: './logs/p0-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 3000,
    max_restarts: 10,
  }],
};
