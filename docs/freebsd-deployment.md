# FreeBSD Deployment Guide — LonliMT2 Webpage

Tested on: FreeBSD 14 with Node.js 20+ installed via pkg.

---

## Requirements

- FreeBSD 14 (13.x is EOL since April 2024 — avoid for production)
- Node.js 20 LTS via pkg
- Apache 2.4 already running (optional — for port 80 proxy)

---

## 1. Install Node.js

```sh
pkg update
pkg install node npm
```

Verify:

```sh
node --version
npm --version
```

> If you get `Undefined symbol "_ZNSt3__122__libcpp_verbose_abortEPKcz"`, your pkg repo is
> likely on `quarterly` with a stale build. Switch to `latest`:
>
> Edit `/etc/pkg/FreeBSD.conf` — change the URL to:
>
> ```
> url: "pkg+http://pkg.FreeBSD.org/${ABI}/latest",
> ```
>
> Then run: `pkg update -f && pkg upgrade && pkg reinstall node`

---

## 2. Copy the project

```sh
git clone <your-repo-url> /usr/metin2/webpage
cd /usr/metin2/webpage
```

---

## 3. Install dependencies

```sh
npm install
```

---

## 4. Build CSS

Must be run after every change to templates or styles:

```sh
npm run build:css
```

---

## 5. Configure the app port

If Apache is already serving content on port 80 and you want to keep it untouched,
run the Node app on a separate port (e.g. 8080).

Edit `src/index.ts`:

```ts
serve({ fetch: app.fetch, port: 8080 }, (info) => {
  console.log(`LonliMT2 running at http://localhost:${info.port}`);
});
```

---

## 6. Create the rc.d service

Create `/usr/local/etc/rc.d/lonlimt2`:

```sh
ee /usr/local/etc/rc.d/lonlimt2
```

Paste:

```sh
#!/bin/sh
  # PROVIDE: lonlimt2
  # REQUIRE: NETWORKING
  # KEYWORD: shutdown

  . /etc/rc.subr

  name="lonlimt2"
  rcvar="lonlimt2_enable"
  pidfile="/var/run/${name}.pid"
  lonlimt2_chdir="/usr/metin2/webpage"

  start_cmd="${name}_start"
  stop_cmd="${name}_stop"

  lonlimt2_start() {
      daemon -p ${pidfile} -o /var/log/lonlimt2.log /bin/sh -c "export PATH=/usr/local/bin:/usr/bin:/bin && cd /usr/metin2/webpage && exec /usr/local/bin/tsx /usr/metin2/webpage/src/index.ts"
      echo "lonlimt2 started."
  }

  lonlimt2_stop() {
      if [ -f ${pidfile} ]; then
          kill $(cat ${pidfile})
          rm -f ${pidfile}
          echo "lonlimt2 stopped."
      else
          echo "lonlimt2 not running."
      fi
  }

  load_rc_config $name
  run_rc_command "$1"
```

Make it executable:

```sh
chmod +x /usr/local/etc/rc.d/lonlimt2
```

Enable and start:

```sh
echo 'lonlimt2_enable="YES"' >> /etc/rc.conf
service lonlimt2 start
```

> `daemon` forks the process into the background so your shell is not locked.

Verify it is running:

```sh
curl http://127.0.0.1:8080
```

---

## 7. Firewall

No firewall was active on the test server (neither `pf` nor `ipfw` enabled).
If you can reach the server IP, port 8080 is already accessible:

```
http://YOUR_SERVER_IP:8080
```

If a firewall is active, open the port:

**pf** — add to `/etc/pf.conf`:

```sh
pass in proto tcp to port 8080
```

```sh
pfctl -f /etc/pf.conf
```

**ipfw**:

```sh
ipfw add allow tcp from any to any 8080
```

---

## 8. Apache reverse proxy (optional — port 80 on a subdomain or IP)

Use this only if you want the app accessible on port 80 alongside existing Apache content.

Enable proxy modules in `/usr/local/etc/apache24/httpd.conf` — uncomment:

```apache
LoadModule proxy_module libexec/apache24/mod_proxy.so
LoadModule proxy_http_module libexec/apache24/mod_proxy_http.so
```

Add a virtual host (use your domain or bare IP):

```apache
<VirtualHost *:80>
    ServerName YOUR_SERVER_IP_OR_DOMAIN

    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:8080/
    ProxyPassReverse / http://127.0.0.1:8080/
</VirtualHost>
```

> Place this block **after** any existing default `<VirtualHost>` blocks so it does not
> override existing content. Check existing blocks with:
>
> ```sh
> grep -r "VirtualHost" /usr/local/etc/apache24/
> ```

Restart Apache:

```sh
service apache24 restart
```

The app is now accessible at `http://YOUR_SERVER_IP` while Apache continues serving
existing content normally.

---

## Service management

```sh
service lonlimt2 start
service lonlimt2 stop
service lonlimt2 restart
```

Check if running:

```sh
cat /var/run/lonlimt2.pid
ps aux | grep tsx
```

View logs (stdout captured by daemon):

```sh
tail -f /var/log/messages
```
