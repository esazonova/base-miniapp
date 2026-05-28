/**
 * Base Mini-App — app.js
 *
 * Connects MetaMask to Base Mainnet (chainId 8453) or Base Sepolia (chainId
 * 84532), displays the connected wallet's ETH balance, and lets the user
 * broadcast a simple ETH transfer.
 *
 * No build step required — plain ES-module-style vanilla JS.
 */

'use strict';

// ── Network definitions ──────────────────────────────────────────────────────
const NETWORKS = {
  mainnet: {
    chainId:        '0x2105',          // 8453
    chainName:      'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls:        ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    badge:          'Base Mainnet',
    badgeClass:     'mainnet',
    explorer:       'https://basescan.org/tx/',
  },
  sepolia: {
    chainId:        '0x14a34',         // 84532
    chainName:      'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls:        ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    badge:          'Base Sepolia',
    badgeClass:     'sepolia',
    explorer:       'https://sepolia.basescan.org/tx/',
  },
};

// ── State ────────────────────────────────────────────────────────────────────
let account   = null;
let networkKey = null;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const networkBadge   = $('networkBadge');
const connectSection = $('connectSection');
const walletSection  = $('walletSection');
const sendSection    = $('sendSection');
const logSection     = $('logSection');
const walletAddress  = $('walletAddress');
const walletBalance  = $('walletBalance');
const txStatus       = $('txStatus');
const activityLog    = $('activityLog');
const toAddress      = $('toAddress');
const sendAmount     = $('sendAmount');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format a hex wei value as a readable ETH string */
function formatEth(hexWei) {
  const wei = BigInt(hexWei);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6) + ' ETH';
}

/** Shorten an address for display */
function short(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

/** Append a line to the activity log */
function log(msg) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const li = document.createElement('li');
  li.innerHTML = `<span class="ts">${now}</span><span>${msg}</span>`;
  activityLog.prepend(li);
  logSection.classList.remove('hidden');
}

/** Show / hide the tx-status banner */
function showStatus(msg, type = 'pending') {
  txStatus.textContent = msg;
  txStatus.className   = `tx-status ${type}`;
  txStatus.classList.remove('hidden');
}
function hideStatus() { txStatus.classList.add('hidden'); }

// ── MetaMask interaction ──────────────────────────────────────────────────────

async function switchToNetwork(key) {
  const net = NETWORKS[key];
  if (!net) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: net.chainId }],
    });
  } catch (err) {
    // 4902 = chain not added yet → add it
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:            net.chainId,
          chainName:          net.chainName,
          nativeCurrency:     net.nativeCurrency,
          rpcUrls:            net.rpcUrls,
          blockExplorerUrls:  net.blockExplorerUrls,
        }],
      });
    } else {
      throw err;
    }
  }
}

async function connect(key) {
  if (!window.ethereum) {
    alert('MetaMask is not installed. Please install it from metamask.io');
    return;
  }

  try {
    await switchToNetwork(key);

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    account    = accounts[0];
    networkKey = key;

    onConnected();
    log(`Connected: ${short(account)} on ${NETWORKS[key].badge}`);
  } catch (err) {
    log(`Connection failed: ${err.message}`);
  }
}

async function fetchBalance() {
  if (!account) return;
  try {
    const hex = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [account, 'latest'],
    });
    walletBalance.textContent = formatEth(hex);
  } catch {
    walletBalance.textContent = 'Error fetching balance';
  }
}

function onConnected() {
  const net = NETWORKS[networkKey];

  // Update badge
  networkBadge.textContent  = net.badge;
  networkBadge.className    = `network-badge ${net.badgeClass}`;

  // Show wallet & send sections
  connectSection.classList.add('hidden');
  walletSection.classList.remove('hidden');
  sendSection.classList.remove('hidden');

  walletAddress.textContent = account;
  fetchBalance();
}

function disconnect() {
  account    = null;
  networkKey = null;

  networkBadge.textContent = '—';
  networkBadge.className   = 'network-badge';

  walletSection.classList.add('hidden');
  sendSection.classList.add('hidden');
  connectSection.classList.remove('hidden');
  hideStatus();
  toAddress.value   = '';
  sendAmount.value  = '';

  log('Wallet disconnected');
}

// ── Send ETH ─────────────────────────────────────────────────────────────────

async function sendEth() {
  const to     = toAddress.value.trim();
  const amount = parseFloat(sendAmount.value);

  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
    showStatus('Invalid recipient address.', 'error');
    return;
  }
  if (isNaN(amount) || amount <= 0) {
    showStatus('Enter a valid ETH amount.', 'error');
    return;
  }

  // Convert ETH → wei hex
  const weiHex = '0x' + BigInt(Math.round(amount * 1e18)).toString(16);

  showStatus('Waiting for MetaMask confirmation…', 'pending');
  $('btnSend').disabled = true;

  try {
    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from:  account,
        to,
        value: weiHex,
      }],
    });

    const explorer = NETWORKS[networkKey].explorer;
    showStatus(
      `Sent! Tx: ${txHash.slice(0, 10)}…  View on explorer: ${explorer}${txHash}`,
      'success'
    );
    log(`Sent ${amount} ETH to ${short(to)} — ${txHash.slice(0, 10)}…`);
    fetchBalance();
  } catch (err) {
    if (err.code === 4001) {
      showStatus('Transaction rejected by user.', 'error');
    } else {
      showStatus(`Error: ${err.message}`, 'error');
    }
    log(`Send failed: ${err.message}`);
  } finally {
    $('btnSend').disabled = false;
  }
}

// ── MetaMask event listeners ──────────────────────────────────────────────────

if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      account = accounts[0];
      walletAddress.textContent = account;
      fetchBalance();
      log(`Account changed: ${short(account)}`);
    }
  });

  window.ethereum.on('chainChanged', () => {
    log('Network changed — reconnect to continue');
    disconnect();
  });
}

// ── Event bindings ────────────────────────────────────────────────────────────

$('btnConnectMainnet').addEventListener('click', () => connect('mainnet'));
$('btnConnectSepolia').addEventListener('click', () => connect('sepolia'));
$('btnDisconnect').addEventListener('click', disconnect);
$('btnRefresh').addEventListener('click', () => { fetchBalance(); log('Balance refreshed'); });
$('btnSend').addEventListener('click', sendEth);
