// src/pages/api/video/[id].ts - Endpoint corregido para videos
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const videoId = params.id;
    
    if (!videoId) {
      return new Response(JSON.stringify({ error: 'Video ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Usar la URL correcta de embedded-video en lugar de la API
    const videoUrl = `https://www.telemundo.com/shows/embedded-video/${videoId}`;
    
    // Hacer solicitud para obtener el HTML de la página
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'X-Forwarded-For': '72.229.28.185',
      }
    });
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Error fetching video: ${response.statusText}` }), 
        { 
          status: response.status,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Obtener el HTML de la página
    const html = await response.text();
    
    // Buscar la URL del stream en el HTML
    // Normalmente, los streams HLS están en un archivo .m3u8 
    // y se incluyen como parte de un script o como parte de un objeto JSON en la página
    
    // Buscar URLs de m3u8 en el HTML
    const m3u8Regex = /(https:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g;
    const m3u8Matches = html.match(m3u8Regex);
    
    let streamUrl = null;
    
    if (m3u8Matches && m3u8Matches.length > 0) {
      // Usar la primera URL de m3u8 encontrada
      streamUrl = m3u8Matches[0];
    } else {
      // Alternativa: buscar un objeto JSON que contenga la configuración del reproductor
      const playerConfigRegex = /playerConfig\s*=\s*({.*?});/s;
      const playerConfigMatch = html.match(playerConfigRegex);
      
      if (playerConfigMatch && playerConfigMatch[1]) {
        try {
          const playerConfig = JSON.parse(playerConfigMatch[1]);
          // La estructura exacta dependerá de cómo Telemundo estructura su configuración
          // Esto es un ejemplo y puede necesitar ajustes
          if (playerConfig.video && playerConfig.video.url) {
            streamUrl = playerConfig.video.url;
          } else if (playerConfig.sources && playerConfig.sources.length > 0) {
            streamUrl = playerConfig.sources[0].src;
          }
        } catch (e) {
          console.error('Error parsing player config:', e);
        }
      }
      
      // Otra alternativa: buscar un objeto de datos en formato JSON+LD
      const jsonLdRegex = /<script type="application\/ld\+json">(.*?)<\/script>/s;
      const jsonLdMatch = html.match(jsonLdRegex);
      
      if (!streamUrl && jsonLdMatch && jsonLdMatch[1]) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          if (jsonLd.contentUrl) {
            streamUrl = jsonLd.contentUrl;
          }
        } catch (e) {
          console.error('Error parsing JSON+LD:', e);
        }
      }
    }
    
    // Buscar el título del video
    const titleRegex = /<title>(.*?)<\/title>/;
    const titleMatch = html.match(titleRegex);
    const title = titleMatch ? titleMatch[1] : `Video ${videoId}`;
    
    // Buscar una imagen de miniatura
    const thumbnailRegex = /<meta property="og:image" content="(https:\/\/[^"]+)"/;
    const thumbnailMatch = html.match(thumbnailRegex);
    const thumbnailUrl = thumbnailMatch ? thumbnailMatch[1] : null;
    
    if (streamUrl) {
      return new Response(JSON.stringify({ 
        title: title,
        streamUrl: streamUrl,
        thumbnailUrl: thumbnailUrl,
        originalUrl: videoUrl
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Si no podemos encontrar la URL del stream, devolvemos el HTML completo
      // para que podamos usar un iframe como plan B
      return new Response(JSON.stringify({ 
        title: title,
        htmlContent: true,
        thumbnailUrl: thumbnailUrl,
        originalUrl: videoUrl
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error:any) {
    console.error('Video API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process video request', details: error.message }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
};