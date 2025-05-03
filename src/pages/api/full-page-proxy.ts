import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const targetUrl = url.searchParams.get('url');
    
    if (!targetUrl) {
      return new Response("URL parameter is required", {
        status: 400
      });
    }
    
    // Headers que simulan una solicitud desde EE.UU.
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.telemundo.com/',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Upgrade-Insecure-Requests': '1',
      'X-Forwarded-For': '72.229.28.185',
    };
    
    const response = await fetch(targetUrl, { headers });
    
    if (!response.ok) {
      return new Response(`Error fetching content: ${response.statusText}`, { 
        status: response.status 
      });
    }
    
    let html = await response.text();
    
    const targetUrlObj = new URL(targetUrl);
    const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`;
    
    // Corregir rutas relativas 
    html = html.replace(/src="\//g, `src="${baseUrl}/`);
    html = html.replace(/href="\//g, `href="${baseUrl}/`);
    
    // Agregar base tag
    html = html.replace(/<head>/i, `<head>
      <base href="${baseUrl}/">
      <meta name="referrer" content="no-referrer">
    `);
    
    // Script avanzado para interceptar JW Player y otras solicitudes
    const interceptScript = `
    <script>
      // Función para notificar que el video está listo
      function notifyVideoReady() {
        console.log("Video ready, notifying parent window");
        window.parent.postMessage('telemundo-video-ready', '*');
      }
      
      // Interceptar fetch para redirigir streams
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === 'string') {
          // Interceptar streams de video
          if (url.includes('.m3u8') || url.includes('.ts')) {
            console.log('Intercepting media URL:', url);
            return originalFetch('/api/media-proxy?url=' + encodeURIComponent(url), options);
          }
          
          // Redirigir otras solicitudes absolutas al mismo dominio
          if (url.startsWith('https://www.telemundo.com/') || url.startsWith('https://media.telemundo.com/')) {
            return originalFetch('/api/resource-proxy?url=' + encodeURIComponent(url), options);
          }
        }
        return originalFetch(url, options);
      };
      
      // Interceptar XMLHttpRequest
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string') {
          if (url.includes('.m3u8') || url.includes('.ts')) {
            url = '/api/media-proxy?url=' + encodeURIComponent(url);
          } else if (url.startsWith('https://www.telemundo.com/') || url.startsWith('https://media.telemundo.com/')) {
            url = '/api/resource-proxy?url=' + encodeURIComponent(url);
          }
        }
        return originalXHROpen.call(this, method, url, ...rest);
      };
      
      // Hook en JW Player
      document.addEventListener('DOMContentLoaded', function() {
        // Esperar a que JW Player esté disponible
        let jwplayerCheckInterval = setInterval(function() {
          if (window.jwplayer) {
            clearInterval(jwplayerCheckInterval);
            console.log("JW Player encontrado, interceptando...");
            
            // Backup del método original
            const originalJwplayerSetup = window.jwplayer.prototype.setup;
            
            // Override del método setup
            window.jwplayer.prototype.setup = function(config) {
              console.log("JW Player setup interceptado", config);
              
              // Modificar la configuración para asegurar autoplay
              if (config) {
                config.autostart = true;
                
                // Si hay sources, modificarlos para usar nuestro proxy
                if (config.sources && Array.isArray(config.sources)) {
                  config.sources = config.sources.map(source => {
                    if (source.file && typeof source.file === 'string') {
                      if (source.file.includes('.m3u8')) {
                        source.file = '/api/media-proxy?url=' + encodeURIComponent(source.file);
                      }
                    }
                    return source;
                  });
                }
                
                // Hook en los eventos del player
                const originalResult = originalJwplayerSetup.call(this, config);
                
                // Escuchar eventos de reproducción
                this.on('ready', function() {
                  console.log("JW Player ready");
                  this.play();
                  setTimeout(notifyVideoReady, 1000);
                });
                
                this.on('play', function() {
                  console.log("JW Player play");
                  notifyVideoReady();
                });
                
                this.on('error', function(e) {
                  console.error("JW Player error", e);
                });
                
                return originalResult;
              }
              
              return originalJwplayerSetup.call(this, config);
            };
          }
        }, 100);
        
        // Configurar monitoreo de elementos de video
        setTimeout(function() {
          const videos = document.querySelectorAll('video');
          if (videos.length > 0) {
            console.log("Videos encontrados:", videos.length);
            videos.forEach(function(video) {
              // Forzar autoplay
              video.autoplay = true;
              video.muted = true; // Autoplay suele requerir muted
              
              // Intentar reproducir
              video.play().then(function() {
                console.log("Video reproduciendo");
                video.muted = false;
                notifyVideoReady();
              }).catch(function(e) {
                console.error("Error al reproducir video:", e);
              });
              
              // Monitorear cambios en src
              const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src').set;
              Object.defineProperty(video, 'src', {
                set: function(url) {
                  console.log("Video src cambiado:", url);
                  if (url && url.startsWith('blob:')) {
                    // Los blob URLs son locales y no pueden ser proxy
                    return originalSrcSetter.call(this, url);
                  }
                  return originalSrcSetter.call(this, url);
                }
              });
            });
          }
        }, 2000);
      });
    </script>
    `;
    
    html = html.replace('</head>', `${interceptScript}</head>`);
    
    const headers_response = new Headers();
    headers_response.set('Content-Type', 'text/html; charset=UTF-8');
    headers_response.set('Access-Control-Allow-Origin', '*');
    
    return new Response(html, {
      status: 200,
      headers: headers_response
    });
    
  } catch (error:any) {
    console.error('Full page proxy error:', error);
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