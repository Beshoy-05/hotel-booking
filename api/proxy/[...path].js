export default async function handler(req, res) {
  try {
    const { path } = req.query; 
    const subPath = Array.isArray(path) ? path.join('/') : path || '';

    const targetUrl = `http://hotel-booking.runasp.net/api/${subPath}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;

    const fetchOptions = {
      method: req.method,
      headers: { ...req.headers },
    };

    delete fetchOptions.headers.host;
    delete fetchOptions.headers['content-length'];

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
      fetchOptions.headers['content-type'] = 'application/json';
    }

    const backendResponse = await fetch(targetUrl, fetchOptions);

    res.status(backendResponse.status);

    backendResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value);
    });

    const buffer = await backendResponse.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Proxy Error" });
  }
}
