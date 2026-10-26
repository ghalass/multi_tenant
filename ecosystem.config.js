module.exports = {
  apps: [
    {
      name: "multi_tenant",
      script: `${__dirname}/node_modules/next/dist/bin/next`,
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "/var/log/pm2/multi_tenant-error.log",
      out_file: "/var/log/pm2/multi_tenant-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};