export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      // Attempt to fetch the asset from the static site build (dist folder)
      let response = await env.ASSETS.fetch(request);
      
      // If the asset is not found (404) and the path looks like a route (no file extension),
      // serve index.html to support React Single Page Application (SPA) routing.
      if (response.status === 404 && !url.pathname.includes('.')) {
        return await env.ASSETS.fetch(new URL('/index.html', request.url));
      }
      
      return response;
    } catch (e) {
      return new Response('Internal Error', { status: 500 });
    }
  },
};