// src/pages/api/stream-proxy.ts - Endpoint para re-transmitir streams
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const streamUrl = url.searchParams.get('url');
    
    if (!streamUrl) {
      return new Response(JSON.stringify({ error: 'Stream URL parameter is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Realizar la solicitud a la URL del stream
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-Forwarded-For': '72.229.28.185',
      }
    });
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Error fetching stream: ${response.statusText}` }), 
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Transmitir los datos del stream manteniendo el tipo de contenido
    const contentType = response.headers.get('content-type');
    
    // Si es un manifest de HLS (.m3u8) o similar, devolvemos el contenido con el tipo correcto
    if (streamUrl.endsWith('.m3u8') || contentType?.includes('application/vnd.apple.mpegurl')) {
      const textData = await response.text();
      return new Response(textData, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*' // Permitir CORS
        }
      });
    }
    
    // Para otros tipos de streams binarios
    const data = await response.arrayBuffer();
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*' // Permitir CORS
      }
    });
  } catch (error:any) {
    console.error('Stream proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy stream', details: error.message }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};
