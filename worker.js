export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Try to fetch the requested asset
    let response = await env.ASSETS.fetch(request);

    // 2. SPA Fallback
    // If 404, and the path looks like a route (not a file), serve index.html.
    // Explicitly handle root '/' to be safe.
    if (response.status === 404 && (!url.pathname.includes('.') || url.pathname === '/')) {
      const indexRequest = new Request(new URL('/index.html', request.url), request);
      response = await env.ASSETS.fetch(indexRequest);
    }

    // 3. Cache Control
    const newHeaders = new Headers(response.headers);
    const isStaticAsset = url.pathname.startsWith('/assets/') || 
                          url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);

    if (isStaticAsset && response.status === 200) {
      newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  },
};