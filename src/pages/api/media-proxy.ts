import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const mediaUrl = url.searchParams.get('url');
    
    if (!mediaUrl) {
      return new Response("Media URL parameter is required", {
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
    
    const response = await fetch(mediaUrl, { headers });
    
    if (!response.ok) {
      return new Response(`Error fetching media: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    const contentType = response.headers.get('content-type');
    
    // Procesar manifiestos HLS
    if (mediaUrl.endsWith('.m3u8') || contentType?.includes('application/vnd.apple.mpegurl')) {
      let content = await response.text();
      
      // Extraer base URL para enlaces relativos
      const mediaUrlObj = new URL(mediaUrl);
      const baseUrl = mediaUrlObj.href.substring(0, mediaUrlObj.href.lastIndexOf('/') + 1);
      
      // Procesar líneas del manifiesto
      const lines = content.split('\n');
      const processedLines = lines.map(line => {
        // Si es una URL absoluta
        if (line.match(/^https?:\/\//)) {
          return `/api/media-proxy?url=${encodeURIComponent(line)}`;
        }
        // Si es una URL relativa (no línea de control)
        else if (line.match(/\.ts$/) || line.match(/\.m3u8$/)) {
          const absoluteUrl = new URL(line, baseUrl).href;
          return `/api/media-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      });
      
      content = processedLines.join('\n');
      
      const headers_response = new Headers();
      headers_response.set('Content-Type', 'application/vnd.apple.mpegurl');
      headers_response.set('Access-Control-Allow-Origin', '*');
      
      return new Response(content, {
        status: 200,
        headers: headers_response
      });
    }
    
    // Para otros tipos de archivos multimedia (ts, mp4, etc.)
    const data = await response.arrayBuffer();
    
    const headers_response = new Headers();
    headers_response.set('Content-Type', contentType || 'application/octet-stream');
    headers_response.set('Access-Control-Allow-Origin', '*');
    
    return new Response(data, {
      status: 200,
      headers: headers_response
    });
    
  } catch (error:any) {
    console.error('Media proxy error:', error);
    return new Response(
      `Media proxy error: ${error.message}`, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
  }
};