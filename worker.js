export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Try to fetch the requested asset from Cloudflare's static asset store
    let response = await env.ASSETS.fetch(request);

    // 2. SPA Fallback: If the asset isn't found (404) and it's not looking like a file (no extension),
    // assume it's a client-side route and serve index.html.
    if (response.status === 404 && !url.pathname.includes('.')) {
      response = await env.ASSETS.fetch(new URL('/index.html', request.url));
    }

    // 3. Apply Cache-Control Headers for Performance
    // Clone the response to modify headers (original response is immutable)
    const newHeaders = new Headers(response.headers);
    
    // Check if the file is a static asset (usually hashed by Vite or in /assets)
    const isStaticAsset = url.pathname.startsWith('/assets/') || 
                          url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);

    if (isStaticAsset && response.status === 200) {
      // Cache hashed assets for 1 year (Immutable)
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // For HTML and other non-hashed files, require revalidation to ensure users see updates immediately
      newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  },
};