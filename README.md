# Service Hub – self-hosted

No `npm install` needed. Requires Node 18+ (or Docker).

## Run
    ADMIN_PASSWORD=your-strong-password PORT=3000 node server.js
Open http://SERVER-IP:3000 → click **🔒 Admin**, enter the password, then add Places, Apps, Ads.
Data is stored in `data/data.json`, uploaded images in `data/uploads/` (back up the `data` folder).

## Docker
    docker build -t service-hub .
    docker run -d --restart=always -p 80:3000 -e ADMIN_PASSWORD=your-strong-password -v hubdata:/data service-hub

## Ubuntu VPS (recommended: keep running + HTTPS)
    sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx
    sudo npm i -g pm2
    cd /var/www/service-hub
    ADMIN_PASSWORD=your-strong-password COOKIE_SECURE=1 pm2 start server.js --name hub
    pm2 save && pm2 startup
Nginx site (`/etc/nginx/sites-available/hub`), then `sudo certbot --nginx -d yourdomain.com`:
    server { server_name yourdomain.com; client_max_body_size 10m;
      location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; } }

Notes: change the default password (`admin123`) before going public; use HTTPS so the password is not sent in clear text.
Logins reset when the server restarts.
