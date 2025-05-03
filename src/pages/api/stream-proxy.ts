import type { APIRoute } from 'astro';



export const GET: APIRoute = async ({ request, url }) => {
  try {
    const streamUrl = url.searchParams.get('url');
    
    if (!streamUrl) {
      return new Response("Stream URL parameter is required", {
        status: 400
      });
    }
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Origin': 'https://www.telemundo.com',
      'Referer': 'https://www.telemundo.com/',
      'X-Forwarded-For': '72.229.28.185',
    };
    
    const response = await fetch(streamUrl, { headers });
    
    if (!response.ok) {
      return new Response(`Error fetching stream: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    const contentType = response.headers.get('content-type');
    let content = await response.text();
    
    // Si es un manifest de HLS (.m3u8), procesamos para proxy-ar los segmentos
    if (streamUrl.endsWith('.m3u8') || contentType?.includes('application/vnd.apple.mpegurl')) {
      // Reemplazar URLs de los segmentos para que pasen por nuestro proxy
      const streamUrlObj = new URL(streamUrl);
      const baseUrl = streamUrlObj.href.substring(0, streamUrlObj.href.lastIndexOf('/') + 1);
      
      // Procesar líneas del manifest
      const lines = content.split('\n');
      const processedLines = lines.map(line => {
        // Si es una URL absoluta de segmento
        if (line.match(/^https?:\/\//)) {
          return `/api/stream-proxy?url=${encodeURIComponent(line)}`;
        }
        // Si es una URL relativa y no es una línea de control
        else if (line.match(/\.ts$/) || line.match(/\.m3u8$/)) {
          // Construir URL absoluta y proxear
          const absoluteUrl = new URL(line, baseUrl).href;
          return `/api/stream-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        return line;
      });
      
      content = processedLines.join('\n');
    }
    
    // Configurar las cabeceras de respuesta
    const headers_response = new Headers();
    headers_response.set('Content-Type', contentType || 'application/octet-stream');
    headers_response.set('Access-Control-Allow-Origin', '*');
    headers_response.set('Cache-Control', 'no-cache');
    
    return new Response(content, {
      status: 200,
      headers: headers_response
    });
    
  } catch (error:any) {
    console.error('Stream proxy error:', error);
    return new Response(
      `Stream proxy error: ${error.message}`, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
  }
};