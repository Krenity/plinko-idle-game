const PORT = 3000;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf("."));
  return MIME_TYPES[ext] || "application/octet-stream";
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    if (pathname === "/") {
      pathname = "/public/index.html";
    }

    // Try public/ first, then dist/
    const publicPath = "." + pathname;
    const distPath = "./dist" + pathname;

    let file = Bun.file(publicPath);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": getMimeType(pathname) },
      });
    }

    file = Bun.file(distPath);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": getMimeType(pathname) },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Dev server running at http://localhost:${server.port}`);
