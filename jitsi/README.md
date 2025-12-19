# Self-Hosted Jitsi Meet Setup

This directory contains the configuration for self-hosting Jitsi Meet with Traefik integration.

## Prerequisites

- Docker and Docker Compose installed on your Linux server
- Traefik already running with the `traefik` network
- Cloudflare DNS configured for `meet.pololabs.io` pointing to your server
- Your server's public IP address

## Deployment Steps

### 1. Copy files to your server

```bash
mkdir -p ~/jitsi
cd ~/jitsi
```

Download the docker-compose.yml and .env.example from the repository:
```bash
curl -O https://raw.githubusercontent.com/jayepolo/codenames/main/jitsi/docker-compose.yml
curl -O https://raw.githubusercontent.com/jayepolo/codenames/main/jitsi/.env.example
```

### 2. Create your .env file

```bash
cp .env.example .env
```

Edit the .env file and set the following required values:

```bash
nano .env
```

**Required changes:**
1. `DOCKER_HOST_ADDRESS` - Set to your server's public IP address
2. `JICOFO_COMPONENT_SECRET` - Generate with: `openssl rand -hex 16`
3. `JICOFO_AUTH_PASSWORD` - Generate with: `openssl rand -hex 16`
4. `JVB_AUTH_PASSWORD` - Generate with: `openssl rand -hex 16`
5. `TZ` - Set to your timezone (e.g., `America/New_York`)

**Example:**
```env
JICOFO_COMPONENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
JICOFO_AUTH_PASSWORD=p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
JVB_AUTH_PASSWORD=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
DOCKER_HOST_ADDRESS=123.456.789.012
TZ=America/New_York
```

### 3. Create required directories

```bash
mkdir -p config/{web,prosody,jicofo,jvb}
```

### 4. Start Jitsi Meet

```bash
docker compose up -d
```

### 5. Verify deployment

Check that all containers are running:
```bash
docker compose ps
```

You should see 4 containers running:
- jitsi-web
- jitsi-prosody
- jitsi-jicofo
- jitsi-jvb

Check logs:
```bash
docker compose logs -f
```

### 6. Test your Jitsi instance

Open https://meet.pololabs.io in your browser. You should see the Jitsi Meet interface.

### 7. Update Codenames app

Once Jitsi is running, update your Codenames deployment:
```bash
cd ~/codenames
docker compose pull
docker compose down
docker compose up -d
```

## Firewall Configuration

Make sure the following ports are open on your server:

- **TCP 80** - HTTP (for Traefik, if not already open)
- **TCP 443** - HTTPS (for Traefik, if not already open)
- **UDP 10000** - JVB media (required for video/audio)

Example for UFW:
```bash
sudo ufw allow 10000/udp
```

Example for iptables:
```bash
sudo iptables -A INPUT -p udp --dport 10000 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

## Performance Tuning

For optimal performance with 12 participants:

1. **Increase UDP buffer sizes** (add to `/etc/sysctl.conf`):
   ```bash
   net.core.rmem_max=26214400
   net.core.rmem_default=26214400
   ```

   Apply with: `sudo sysctl -p`

2. **Monitor resources**:
   ```bash
   docker stats jitsi-jvb
   ```

## Troubleshooting

### Video/audio not connecting

1. Check JVB is advertising correct IP:
   ```bash
   docker compose logs jvb | grep "Advertised address"
   ```
   Should show your public IP.

2. Verify UDP port 10000 is open:
   ```bash
   sudo netstat -tulpn | grep 10000
   ```

3. Test from outside network - the public Jitsi service may work locally but fail from external networks.

### Containers not starting

Check logs:
```bash
docker compose logs
```

### SSL/Certificate issues

Since Traefik handles SSL, make sure:
- Traefik is properly configured with Cloudflare cert resolver
- DNS is pointing to your server
- Wait a few minutes for certificates to be issued

## Maintenance

### View logs
```bash
docker compose logs -f
```

### Restart services
```bash
docker compose restart
```

### Update Jitsi
```bash
docker compose pull
docker compose down
docker compose up -d
```

### Stop Jitsi
```bash
docker compose down
```

## Capacity

With typical server resources:
- **4GB RAM + 2 CPU cores**: Comfortable for 12-15 participants
- **8GB RAM + 4 CPU cores**: Comfortable for 25-30 participants

Monitor resource usage with `docker stats` during peak usage.

## Security Notes

- By default, authentication is disabled (`ENABLE_AUTH=0`) allowing anyone to create rooms
- Rooms are isolated - participants can only join rooms they know the name of
- For production use with sensitive meetings, consider enabling authentication
- All traffic is encrypted via HTTPS (handled by Traefik)
- Jitsi components communicate on an internal Docker network

## Support

For Jitsi-specific issues, consult:
- Official documentation: https://jitsi.github.io/handbook/
- Community forum: https://community.jitsi.org/
