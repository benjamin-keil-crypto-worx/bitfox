#!/usr/bin/env bash
set -e

echo "=== BitFox Pi Setup ==="

if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

echo "Installing dependencies..."
npm install

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env — edit it with your API keys"
fi

mkdir -p logs

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. nano .env            # Add your Bybit API keys"
echo "  2. pm2 start ecosystem.config.js"
echo "  3. pm2 save"
echo "  4. pm2 startup          # Auto-start on boot"
echo ""
echo "Useful commands:"
echo "  pm2 logs bitfox         # View logs"
echo "  pm2 monit               # Monitor CPU/memory"
echo "  pm2 restart bitfox      # Restart bot"
