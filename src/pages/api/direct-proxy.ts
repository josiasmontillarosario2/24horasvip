import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Obtener la URL objetivo desde los parámetros de consulta
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response("URL parameter is required", {
        status: 400
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
      return new Response(`Error fetching content: ${response.statusText}`, { 
        status: response.status
      });
    }
    
    // Obtener el HTML de la página
    let html = await response.text();
    
    // Extraer el dominio base de la URL objetivo
    const targetUrlObj = new URL(targetUrl);
    const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`;
    
    // Reemplazar URLs relativas con absolutas para que funcionen en el iframe
    html = html.replace(/src="\//g, `src="${baseUrl}/`);
    html = html.replace(/href="\//g, `href="${baseUrl}/`);
    
    // Reemplazar las URL de videos .m3u8 para que pasen por nuestro proxy
    html = html.replace(/(https:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g, 
      (match) => `/api/stream-proxy?url=${encodeURIComponent(match)}`);
    
    // Agregar una etiqueta base para manejar rutas relativas
    html = html.replace(/<head>/i, `<head><base href="${baseUrl}/">`);
    
    // Agregar meta para permitir reproducción en iframe
    html = html.replace(/<head>/i, `<head>
      <meta name="referrer" content="no-referrer">
      <meta http-equiv="Content-Security-Policy" content="frame-ancestors *">
    `);
    
    // Agregar script para interceptar solicitudes y bypass restricciones
    const interceptScript = `
    <script>
      // Interceptar solicitudes fetch para redirigirlas a través de nuestro proxy
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        // Si la URL es absoluta y contiene un stream .m3u8
        if (typeof url === 'string' && url.includes('.m3u8')) {
          console.log('Intercepting HLS stream:', url);
          return originalFetch('/api/stream-proxy?url=' + encodeURIComponent(url), options);
        }
        return originalFetch(url, options);
      };
      
      // Auto-play video cuando esté listo
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
          const videoElements = document.querySelectorAll('video');
          videoElements.forEach(function(video) {
            video.play().catch(function(error) {
              console.warn('Auto-play was prevented:', error);
            });
          });
          
          // Intentar iniciar players de video
          if (window.videojs) {
            const players = document.querySelectorAll('.video-js');
            players.forEach(function(player) {
              videojs(player).play();
            });
          }
        }, 1000);
      });
    </script>
    `;
    
    html = html.replace('</head>', `${interceptScript}</head>`);
    
    // Eliminar posibles scripts de comprobación geográfica
    html = html.replace(/<script[^>]*geo[^>]*>.*?<\/script>/gi, '');
    
    // Establecer las cabeceras de la respuesta
    const headers_response = new Headers();
    headers_response.set('Content-Type', 'text/html; charset=UTF-8');
    headers_response.set('Access-Control-Allow-Origin', '*');
    
    return new Response(html, {
      status: 200,
      headers: headers_response
    });
    
  } catch (error:any) {
    console.error('Proxy error:', error);
    return new Response(
      `Error: ${error.message}`, 
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain'
        }
      }
    );
  }
};