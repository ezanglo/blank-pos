/**
 * Production under PM2: Next serves HTTP loopback-only; `local-ssl-proxy` terminates TLS for browsers.
 * Next logs only http://127.0.0.1:PORT. The HTTPS listen URL prints once from `blank-pos-https`
 * (`pnpm run pm2:logs:https` or `pnpm run pm2:logs` for all apps).
 *
 * 1. `npm run build && npm run pm2:start`
 * 2. Open `https://<host>:HTTPS_PORT` (default 3443). Set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`
 *    to match (e.g. `https://192.168.1.10:3443`).
 * 3. The bundled proxy cert is CN=localhost. For LAN IPs, set `HTTPS_CERT` + `HTTPS_KEY` (e.g. mkcert
 *    including your LAN IP in SAN), or browsers will warn until you trust those files.
 */

const upstreamPort = process.env.PORT ?? "3000"
const httpsListenPort = process.env.HTTPS_PORT ?? "3443"

const sslProxyArgs = () => {
  const args = [
    "-s",
    httpsListenPort,
    "-t",
    upstreamPort,
    "-n",
    "127.0.0.1",
  ]
  const cert = process.env.HTTPS_CERT
  const key = process.env.HTTPS_KEY
  if (cert && key) args.push("-c", cert, "-k", key)
  return args
}

module.exports = {
  apps: [
    {
      name: "blank-pos",
      cwd: __dirname,
      script: "npm",
      // Loopback only — reachable through blank-pos-https (or direct HTTP if you bypass the proxy locally).
      args: "run start -- -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: upstreamPort,
      },
    },
    {
      name: "blank-pos-https",
      cwd: __dirname,
      interpreter: "node",
      script: `${__dirname}/node_modules/local-ssl-proxy/build/main.js`,
      args: sslProxyArgs(),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "128M",
    },
  ],
}
