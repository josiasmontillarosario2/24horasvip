// src/pages/api/proxy.ts - Endpoint de proxy simple
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Obtener la URL objetivo desde los parámetros de consulta
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'URL parameter is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Headers que simulan una solicitud desde EE.UU.
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.telemundo.com/',
      'X-Forwarded-For': '72.229.28.185',
    };
    
    // Realizar la solicitud a la URL objetivo
    const response = await fetch(targetUrl, { headers });
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Error fetching content: ${response.statusText}` }), 
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Obtener el tipo de contenido para la respuesta
    const contentType = response.headers.get('content-type');
    
    // Crear headers para la respuesta
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType || 'text/html');
    
    // Agregar CORS headers para permitir el acceso desde cualquier origen
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Para contenido HTML, necesitamos modificarlo para que las rutas relativas funcionen
    if (contentType && contentType.includes('text/html')) {
      let html = await response.text();
      
      // Extraer el dominio base de la URL objetivo
      const targetUrlObj = new URL(targetUrl);
      const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`;
      
      // Reemplazar rutas relativas con rutas absolutas
      html = html.replace(/src="\/([^"]*)"/g, `src="${baseUrl}/$1"`);
      html = html.replace(/href="\/([^"]*)"/g, `href="${baseUrl}/$1"`);
      
      // Reemplazar URLs externas con rutas a través de nuestro proxy
      // html = html.replace(/(https?:\/\/[^"'\s]+\.(m3u8|mp4|ts)[^"'\s]*)/g, 
      //  (match) => `/api/proxy?url=${encodeURIComponent(match)}`);
      
      // Agregar base tag para que las rutas relativas funcionen correctamente
      html = html.replace(/<head>/i, `<head><base href="${baseUrl}/">`);
      
      // Opcionalmente, inyectar un script para interceptar solicitudes de red
      const interceptScript = `
        <script>
          // Interceptar solicitudes fetch para redirigirlas a través de nuestro proxy
          const originalFetch = window.fetch;
          window.fetch = function(url, options) {
            // Si la URL es absoluta y no apunta a nuestro dominio
            if (url.startsWith('http') && !url.includes(window.location.host)) {
              return originalFetch('/api/proxy?url=' + encodeURIComponent(url), options);
            }
            return originalFetch(url, options);
          };
        </script>
      `;
      
      html = html.replace('</head>', `${interceptScript}</head>`);
      
      return new Response(html, {
        status: 200,
        headers: responseHeaders
      });
    }
    
    // Para otros tipos de contenido (imágenes, videos, etc.)
    const data = await response.arrayBuffer();
    return new Response(data, {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error:any) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to proxy content', details: error.message }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};