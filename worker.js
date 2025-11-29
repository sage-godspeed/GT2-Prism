export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Try to fetch the requested asset from Cloudflare's asset store
    let response = await env.ASSETS.fetch(request);

    // 2. SPA Fallback (Single Page Application)
    // If the asset is not found (404) and it's not a direct file request (no extension),
    // serve index.html to let React Router (if used) or the App handle the view.
    if (response.status === 404 && !url.pathname.includes('.')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    // 3. Cache Control
    const newHeaders = new Headers(response.headers);
    
    // Vite puts hashed files in /assets/. These are safe to cache forever.
    const isImmutableAsset = url.pathname.startsWith('/assets/');
    
    if (response.status === 200) {
      if (isImmutableAsset) {
        // Cache hashed assets for 1 year
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // For index.html, favicon, or files in public/, always check for updates
        newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  },
};