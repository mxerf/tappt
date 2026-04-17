# tappt playground

Static, framework-free demo that imports `@mxerf/tappt` from [esm.sh](https://esm.sh) and exposes every method as a button. Open it on a real phone to feel the haptics.

## Local preview

```sh
bunx serve examples/playground
# or
python3 -m http.server --directory examples/playground 8000
```

## Deploy (Dokploy / any Docker host)

The directory ships a minimal Dockerfile (nginx:alpine) plus `nginx.conf` with cache headers and a tight CSP (only `esm.sh` and `telegram.org` are allowlisted).

In Dokploy:

1. Create a new **Application** → **Dockerfile** build type.
2. Source: this repo, context path `examples/playground`.
3. Domain: `tappt.mxerf.com`, enable HTTPS.
4. Deploy.

That's it — static HTML + one JS module + one CSS file. No build step.
