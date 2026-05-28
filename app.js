/**
 * Base Mini-App — app.js
 *
 * Connects MetaMask to Base Mainnet (chainId 8453) or Base Sepolia (chainId
 * 84532), displays the connected wallet's ETH balance, and lets the user
 * broadcast a simple ETH transfer.
 */

'use strict';

const NETWORKS = {
  mainnet: {
    chainId:           '0x2105',
    chainName:         'Base',
    nativeCurrency:    { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls:           ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    badge:             'Base Mainnet',
    badgeClass:        'mainnet',
    explorer:          'https://basescan.org/tx/',
  },
  sepolia: {
    chainId:           '0x14a34',
    chainName:         'Base Sepolia',
    nativeCurrency:    { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls:           ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    badge:             'Base Sepolia',
    badgeClass:        'sepolia',
    explorer:          'https://sepolia.basescan.org/tx/',
  },
};

let account    = null;
let networkKey = null;

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

function formatEth(hexWei) {
  const wei = BigInt(hexWei);
  const eth = Number(wei) / 1e18;
  return eth.toFixed(6) + ' ETH';
}

function short(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function log(msg) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const li  = document.createElement('li');
  li.innerHTML = `<span class="ts">${now}</span><span>${msg}</span>`;
  activityLog.prepend(li);
  logSection.classList.remove('hidden');
}

function showStatus(msg, type = 'pending') {
  txStatus.textContent = msg;
  txStatus.className   = `tx-status ${type}`;
  txStatus.classList.remove('hidden');
}
function hideStatus() { txStatus.classList.add('hidden'); }

async function switchToNetwork(key) {
  const net = NETWORKS[key];
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.chainId }] });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: net.chainId, chainName: net.chainName, nativeCurrency: net.nativeCurrency, rpcUrls: net.rpcUrls, blockExplorerUrls: net.blockExplorerUrls }],
      });
    } else { throw err; }
  }
}

async function connect(key) {
  if (!window.ethereum) { alert('MetaMask is not installed.'); return; }
  try {
    await switchToNetwork(key);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    account    = accounts[0];
    networkKey = key;
    onConnected();
    log(`Connected: ${short(account)} on ${NETWORKS[key].badge}`);
  } catch (err) { log(`Connection failed: ${err.message}`); }
}

async function fetchBalance() {
  if (!account) return;
  try {
    const hex = await window.ethereum.request({ method: 'eth_getBalance', params: [account, 'latest'] });
    walletBalance.textContent = formatEth(hex);
  } catch { walletBalance.textContent = 'Error fetching balance'; }
}

function onConnected() {
  const net = NETWORKS[networkKey];
  networkBadge.textContent = net.badge;
  networkBadge.className   = `network-badge ${net.badgeClass}`;
  connectSection.classList.add('hidden');
  walletSection.classList.remove('hidden');
  sendSection.classList.remove('hidden');
  walletAddress.textContent = account;
  fetchBalance();
  $('statsSection').classList.remove('hidden');
  fetchNetworkStats();
}

function disconnect() {
  account = null; networkKey = null;
  networkBadge.textContent = '—';
  networkBadge.className   = 'network-badge';
  walletSection.classList.add('hidden');
  sendSection.classList.add('hidden');
  $('statsSection').classList.add('hidden');
  connectSection.classList.remove('hidden');
  hideStatus();
  toAddress.value = ''; sendAmount.value = '';
  log('Wallet disconnected');
}

async function sendEth() {
  const to     = toAddress.value.trim();
  const amount = parseFloat(sendAmount.value);
  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) { showStatus('Invalid recipient address.', 'error'); return; }
  if (isNaN(amount) || amount <= 0)      { showStatus('Enter a valid ETH amount.', 'error');  return; }
  const weiHex = '0x' + BigInt(Math.round(amount * 1e18)).toString(16);
  showStatus('Waiting for MetaMask confirmation…', 'pending');
  $('btnSend').disabled = true;
  try {
    const txHash = await window.ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to, value: weiHex }] });
    const explorer = NETWORKS[networkKey].explorer;
    showStatus(`Sent! Tx: ${txHash.slice(0,10)}…  Explorer: ${explorer}${txHash}`, 'success');
    log(`Sent ${amount} ETH to ${short(to)} — ${txHash.slice(0,10)}…`);
    fetchBalance();
  } catch (err) {
    showStatus(err.code === 4001 ? 'Transaction rejected by user.' : `Error: ${err.message}`, 'error');
    log(`Send failed: ${err.message}`);
  } finally { $('btnSend').disabled = false; }
}

if (window.ethereum) {
  window.ethereum.on('accountsChanged', accounts => {
    if (!accounts.length) { disconnect(); return; }
    account = accounts[0];
    walletAddress.textContent = account;
    fetchBalance();
    log(`Account changed: ${short(account)}`);
  });
  window.ethereum.on('chainChanged', () => { log('Network changed — reconnect to continue'); disconnect(); });
}

$('btnConnectMainnet').addEventListener('click', () => connect('mainnet'));
$('btnConnectSepolia').addEventListener('click', () => connect('sepolia'));
$('btnDisconnect').addEventListener('click', disconnect);
$('btnRefresh').addEventListener('click', () => { fetchBalance(); log('Balance refreshed'); });
$('btnSend').addEventListener('click', sendEth);

// ── Copy address ─────────────────────────────────────────────────────────────
$('btnCopy').addEventListener('click', async () => {
  if (!account) return;
  try {
    await navigator.clipboard.writeText(account);
    const btn = $('btnCopy');
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('copied'); }, 1500);
    log('Address copied to clipboard');
  } catch { log('Clipboard access denied'); }
});

// ── Network stats ─────────────────────────────────────────────────────────────
async function fetchNetworkStats() {
  try {
    const [blockHex, gasPriceHex, chainIdHex] = await Promise.all([
      window.ethereum.request({ method: 'eth_blockNumber',        params: [] }),
      window.ethereum.request({ method: 'eth_gasPrice',           params: [] }),
      window.ethereum.request({ method: 'eth_chainId',            params: [] }),
    ]);

    $('statBlock').textContent    = parseInt(blockHex, 16).toLocaleString();
    $('statGasPrice').textContent = (parseInt(gasPriceHex, 16) / 1e9).toFixed(3) + ' Gwei';
    $('statChainId').textContent  = parseInt(chainIdHex, 16);

    // Fetch latest block for base fee (EIP-1559)
    const block = await window.ethereum.request({
      method: 'eth_getBlockByNumber',
      params: [blockHex, false],
    });
    if (block && block.baseFeePerGas) {
      $('statBaseFee').textContent = (parseInt(block.baseFeePerGas, 16) / 1e9).toFixed(3) + ' Gwei';
    } else {
      $('statBaseFee').textContent = 'N/A';
    }
  } catch (e) {
    $('statBlock').textContent = $('statGasPrice').textContent = '—';
  }
}

// Show stats section when connected and wire refresh button
const _origOnConnected = onConnected;
// Patch onConnected to also show stats
const statsSection = $('statsSection');
const _onConnectedOrig = window._onConnectedOrig;

$('btnRefreshStats').addEventListener('click', () => { fetchNetworkStats(); log('Network stats refreshed'); });

// ── Gas estimator ─────────────────────────────────────────────────────────────
async function estimateGas() {
  const to     = $('toAddress').value.trim();
  const amount = parseFloat($('sendAmount').value);
  if (!account || !/^0x[0-9a-fA-F]{40}$/.test(to) || isNaN(amount) || amount <= 0) {
    $('gasEstimate').classList.add('hidden');
    return;
  }
  const weiHex = '0x' + BigInt(Math.round(amount * 1e18)).toString(16);
  try {
    const [gasHex, gasPriceHex] = await Promise.all([
      window.ethereum.request({ method: 'eth_estimateGas', params: [{ from: account, to, value: weiHex }] }),
      window.ethereum.request({ method: 'eth_gasPrice', params: [] }),
    ]);
    const gasUnits = parseInt(gasHex, 16);
    const gasPrice = parseInt(gasPriceHex, 16);
    const costEth  = (gasUnits * gasPrice / 1e18).toFixed(8);
    $('gasEstimateValue').textContent = `${gasUnits.toLocaleString()} units ≈ ${costEth} ETH`;
    $('gasEstimate').classList.remove('hidden');
  } catch {
    $('gasEstimate').classList.add('hidden');
  }
}

$('toAddress').addEventListener('blur',  estimateGas);
$('sendAmount').addEventListener('blur', estimateGas);

// ── Transaction history ───────────────────────────────────────────────────────
const HISTORY_KEY = 'base_miniapp_tx_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

function addToHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  saveHistory(history);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  const txList  = $('txList');
  const section = $('historySection');

  if (!history.length) { section.classList.add('hidden'); return; }

  section.classList.remove('hidden');
  txList.innerHTML = '';

  history.forEach(tx => {
    const net      = NETWORKS[tx.network] || NETWORKS.mainnet;
    const explorer = net.explorer + tx.hash;
    const li       = document.createElement('li');
    li.className   = 'tx-item';
    li.innerHTML   = `
      <div class="tx-row">
        <a class="tx-hash" href="${explorer}" target="_blank" rel="noopener">${tx.hash.slice(0,10)}…${tx.hash.slice(-6)}</a>
        <span class="tx-amount">${tx.amount} ETH</span>
      </div>
      <div class="tx-row">
        <span class="tx-meta">To: ${tx.to.slice(0,8)}…${tx.to.slice(-4)}</span>
        <span class="tx-meta">${tx.date}</span>
      </div>`;
    txList.appendChild(li);
  });
}

// Hook into sendEth to record successful txs
const _origSendEth = sendEth;
// Override send to persist history — patch after definition
document.addEventListener('DOMContentLoaded', () => {});

$('btnSend').addEventListener('tx-recorded', e => {});  // placeholder

// Patch sendEth to save tx after success — inject via event
(function patchSend() {
  const btn = $('btnSend');
  // We re-wire the click listener to wrap sendEth with history recording
  btn.removeEventListener('click', sendEth);
  btn.addEventListener('click', async () => {
    const to     = $('toAddress').value.trim();
    const amount = parseFloat($('sendAmount').value);
    await sendEth();
    // Check if send succeeded by looking at txStatus class
    if ($('txStatus').classList.contains('success') && account) {
      addToHistory({
        hash:    $('txStatus').textContent.match(/0x[0-9a-fA-F]+/)?.[0] || '',
        to,
        amount:  isNaN(amount) ? '?' : amount.toString(),
        network: networkKey,
        date:    new Date().toLocaleString(),
      });
    }
  });
})();

$('btnClearHistory').addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  log('Transaction history cleared');
});

// Render on load
renderHistory();

// ── Theme toggle ─────────────────────────────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('base_miniapp_theme') || 'dark';
  if (saved === 'light') { document.body.classList.add('light'); $('btnTheme').textContent = '🌙'; }
})();

$('btnTheme').addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  $('btnTheme').textContent = isLight ? '🌙' : '☀';
  localStorage.setItem('base_miniapp_theme', isLight ? 'light' : 'dark');
});
