// middleware.js - Middleware opcional para manejar todas las solicitudes
export default function middleware(request) {
    const url = new URL(request.url);
    
    // Añadir headers específicos a todas las solicitudes
    const headers = new Headers(request.headers);
    
    // Si estamos accediendo a una ruta de API
    if (url.pathname.startsWith('/api/')) {
      // Puedes realizar verificaciones adicionales aquí
      // Por ejemplo, comprobar una clave de API o limitar la tasa de solicitudes
    }
    
    // Continuar con la solicitud
    return new Response(null, {
      status: 200,
      headers,
    });
  }
  
  export const config = {
    matcher: [
      // Solo aplica este middleware a rutas específicas
      '/api/:path*',
    ],
  };