# 🚀 Linux Deployment Notes (Faasen Trading)

## 1. Server Setup
- **OS:** Ubuntu 22.04 LTS (VM)
- **Security:**
  - Enabled firewall (UFW) with OpenSSH allowed
- **Node Environment:**
  - Installed **NVM**
  - Installed **Node.js LTS** via NVM
  - Installed project dependencies using `npm install`
- **Version Control:**
  - Generated SSH keypair for GitHub access
  - Added public key to GitHub
  - Set repo remote to SSH
  - Verified authentication via `ssh -T git@github.com`
- **Code Base:**
  - Cloned project into `/home/faasen/projects/Faasen-Trading`

---

## 2. Systemd Service (Production)
**Service file path:**
`/etc/systemd/system/faasentrading.service`

**Purpose:**
Runs the Next.js application in **production mode** using a custom startup script that loads NVM and launches the app.

**Key Features:**
- Loads NVM automatically
- Runs Next.js in production (`npm start`)
- Automatically restarts on failure
- Auto-starts on boot
- Controlled working directory
- Managed entirely through systemd

### `start-faasentrading.sh` (project root)

```bash
#!/usr/bin/env bash
set -e

# Load NVM environment
export NVM_DIR="/home/faasen/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/faasen/projects/Faasen-Trading

npm start

