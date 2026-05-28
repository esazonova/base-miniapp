# Base Mini-App

A lightweight single-page application for the [Base](https://base.org) L2 network.

**Features**
- Connect MetaMask to **Base Mainnet** or **Base Sepolia** (auto-adds the network if needed)
- View your ETH balance
- Send ETH to any address
- Activity log with timestamps
- No build step — plain HTML + CSS + JS

## Quick start

```bash
git clone https://github.com/esazonova/base-miniapp
cd base-miniapp
# open index.html in your browser, or serve with:
npx serve .
```

Requires [MetaMask](https://metamask.io) installed in your browser.

## Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Base Mainnet | 8453 | https://mainnet.base.org |
| Base Sepolia | 84532 | https://sepolia.base.org |

## Project structure

```
index.html   # markup
style.css    # dark-theme styles
app.js       # wallet logic (MetaMask EIP-1193)
```

## License

MIT
