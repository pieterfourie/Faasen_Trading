# Linux Deployment Notes

## Server Setup
- Ubuntu 22.04 VM
- Installed NVM + Node
- Hardened with sudo user + UFW
- Cloned project repo

## Systemd Service
Location:
  /etc/systemd/system/faasentrading.service

Key features:
- Runs Next.js in production
- Loads via start-faasentrading.sh
- Restart on failure
- Auto-start on boot

## Deployment Workflow
1. git pull
2. npm install
3. npm run build
4. systemctl restart faasentrading
5. Verified via http://localhost:3000
