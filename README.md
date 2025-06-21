# Base Mini-App

A lightweight single-page application for the [Base](https://base.org) L2 network.  
No build step, no framework — just HTML, CSS, and vanilla JavaScript.

## Features

- Connect MetaMask to **Base Mainnet** (8453) or **Base Sepolia** (84532)
- Automatic network switching / adding via `wallet_addEthereumChain`
- Live ETH balance display
- Send ETH with gas estimation before confirmation
- Transaction history stored in `localStorage`
- Live address / amount validation
- Network stats: block number, base fee, gas price
- Light / dark theme toggle (preference saved to `localStorage`)
- One-click address copy to clipboard

## Quick start

```bash
git clone https://github.com/esazonova/base-miniapp
cd base-miniapp
# Option 1 — open directly
open index.html

# Option 2 — local server (recommended for clipboard API)
npx serve .
```

Requires [MetaMask](https://metamask.io) installed in your browser.

## Networks

| Network | Chain ID | RPC endpoint |
|---------|----------|--------------|
| Base Mainnet | 8453 | https://mainnet.base.org |
| Base Sepolia | 84532 | https://sepolia.base.org |

## Project structure

```
index.html      # page markup and card layout
style.css       # dark/light theme, animations, component styles
app.js          # wallet logic, EIP-1193 provider calls, localStorage
CONTRIBUTING.md # contributor guidelines
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
