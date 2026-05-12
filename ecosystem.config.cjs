// PM2 进程清单。两个进程：web 和 worker。
// 用法：
//   pm2 start ecosystem.config.cjs
//   pm2 reload ecosystem.config.cjs --update-env
//   pm2 logs web
//   pm2 logs worker

module.exports = {
  apps: [
    {
      name: "web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      // PM2 把 stdout/stderr 写到 ~/.pm2/logs/
      out_file: "logs/web.out.log",
      error_file: "logs/web.error.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "worker",
      script: "node_modules/.bin/tsx",
      args: "worker/index.ts",
      cwd: __dirname,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      out_file: "logs/worker.out.log",
      error_file: "logs/worker.error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
