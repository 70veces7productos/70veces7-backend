import { kv } from '@vercel/kv';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // Headers de respuesta (ahora van antes del preflight)
  res.setHeader('Content-Type', 'application/json');
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const { action, userId, pin, data, tipo } = req.body || {};

  if (!userId || !pin) {
    return res.status(400).json({ error: 'userId y pin requeridos' });
  }

  const userKey = `70veces7:${userId}:${pin}`;

  try {
    if (action === 'guardar') {
      // Guardar datos encriptados en KV
      if (!tipo || !data) {
        return res.status(400).json({ error: 'tipo y data requeridos' });
      }

      const fullKey = `${userKey}:${tipo}`;
      await kv.set(fullKey, data);

      return res.status(200).json({
        success: true,
        message: `${tipo} sincronizado`,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'cargar') {
      // Cargar todos los datos del usuario
      if (!tipo) {
        return res.status(400).json({ error: 'tipo requerido' });
      }

      const fullKey = `${userKey}:${tipo}`;
      const data = await kv.get(fullKey);

      if (!data) {
        return res.status(404).json({ error: 'Datos no encontrados' });
      }

      return res.status(200).json({
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'listar') {
      // Listar todos los tipos de datos disponibles
      const keys = await kv.keys(`${userKey}:*`);
      const tipos = keys.map(k => k.split(':').pop());

      return res.status(200).json({
        success: true,
        tipos: tipos,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'status') {
      // Check si el usuario tiene datos en el servidor
      const keys = await kv.keys(`${userKey}:*`);

      return res.status(200).json({
        success: true,
        tieneSync: keys.length > 0,
        tipos: keys.map(k => k.split(':').pop()),
        timestamp: new Date().toISOString()
      });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Error en el servidor',
      message: error.message
    });
  }
}
