module.exports = {
  apps: [
    {
      name: 'wa-notifier',
      script: 'src/index.js',
      instances: 1, // Single instance ONLY — WhatsApp allows 1 socket connection per session
      exec_mode: 'fork',
      watch: false, // Do NOT watch in production
      autorestart: true,
      restart_delay: 5000, // Wait 5s before restart
      exp_backoff_restart_delay: 2000,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};