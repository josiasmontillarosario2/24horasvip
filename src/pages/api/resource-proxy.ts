import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const resourceUrl = url.searchParams.get('url');
    
    if (!resourceUrl) {
      return new Response("Resource URL parameter is required", {
        status: 400
      });
    }
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.telemundo.com',
      'Referer': 'https://www.telemundo.com/',
      'X-Forwarded-For': '72.229.28.185',
    };
    
    const response = await fetch(resourceUrl, { headers });
    
    if (!response.ok) {
      return new Response(`Error fetching resource: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    const contentType = response.headers.get('content-type');
    const data = await response.arrayBuffer();
    
    const headers_response = new Headers();
    headers_response.set('Content-Type', contentType || 'application/octet-stream');
    headers_response.set('Access-Control-Allow-Origin', '*');
    
    return new Response(data, {
      status: 200,
      headers: headers_response
    });
    
  } catch (error:any) {
    console.error('Resource proxy error:', error);
    return new Response(
      `Resource proxy error: ${error.message}`, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
  }
};