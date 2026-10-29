import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";
import { createApp } from "./app.js";
// Respect managed HTTPS proxy and inherited CA trust; never disable TLS verification.
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY)
  setGlobalDispatcher(new EnvHttpProxyAgent());
const port = Number(process.env.PORT) || 3001;
const server = createApp().listen(port, "0.0.0.0", () =>
  console.log(`Crave server listening on port ${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
