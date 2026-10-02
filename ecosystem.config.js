module.exports = {
  apps: [{
    name: 'multi_tenant',
    script: 'pnpm',          // Utilisez npm directement
    args: "exec next start -p 3001",        // Avec l'argument 'start'
    cwd: "/home/ghalass/actions-runner/_work/multi_tenant/multi_tenant",
    instances: 1,           // Commencez avec 1 instance
    exec_mode: 'fork',      // Fork mode pour éviter les problèmes
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    interpreter: 'none',    // IMPORTANT: pas d'interpréteur
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/log/pm2/gmao-error.log',
    out_file: '/var/log/pm2/gmao-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
