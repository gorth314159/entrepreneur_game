import Player from './game/Player.js';
import { Property, Bank, AdServices, Farm, B2CProperty, Apartments } from './game/Property.js';
import Town from './game/Town.js';
import Map from './game/Map.js';

// --- GAME STATE ---
let players = [];
let properties = [];
let town = null;
let map = null;
let animationStarted = false;

let currentPlayerIndex = 0;
let selectedProperty = null;
let maxDays = 30;
let activeTab = 'tab-properties';
let pendingOffer = null;
let currentOnboardingStep = 0;


// --- PRESET COLORS ---
const COLOR_PRESETS = [
  '#00f2fe', // Electric Cyan
  '#d946ef', // Neon Purple
  '#10b981', // Emerald Green
  '#f59e0b', // Amber Gold
];

// --- DOM ELEMENTS ---
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const endgameScreen = document.getElementById('endgame-screen');
const bankOverlay = document.getElementById('bank-overlay');
const helpOverlay = document.getElementById('help-overlay');
const simulationOverlay = document.getElementById('simulation-overlay');
const canvas = document.getElementById('game-canvas');

const playerSetupContainer = document.getElementById('players-setup-container');
const btnStartGame = document.getElementById('btn-start-game');
const playerCountSelect = document.getElementById('player-count');
const gameLengthSelect = document.getElementById('game-length');

const hudDay = document.getElementById('hud-day');
const hudPopulation = document.getElementById('hud-population');
const hudAffluence = document.getElementById('hud-affluence');

const turnBanner = document.getElementById('turn-banner');
const currentPlayerName = document.getElementById('current-player-name');
const statCash = document.getElementById('stat-cash');
const statDebt = document.getElementById('stat-debt');
const statNetworth = document.getElementById('stat-networth');

const inspectorPanel = document.getElementById('inspector-panel');
const inspName = document.getElementById('insp-name');
const inspType = document.getElementById('insp-type');
const inspOwner = document.getElementById('insp-owner');
const inspStatsContainer = document.getElementById('insp-stats-container');
const inspCustomActions = document.getElementById('insp-custom-actions');
const inspButtonsContainer = document.getElementById('insp-buttons-container');

const tabProperties = document.getElementById('tab-properties');
const tabSkills = document.getElementById('tab-skills');
const tabLedger = document.getElementById('tab-ledger');
const playerPropertiesList = document.getElementById('player-properties-list');
const playerSkillsList = document.getElementById('player-skills-list');
const playerLedgerList = document.getElementById('player-ledger-list');

const btnEndTurn = document.getElementById('btn-end-turn');
const btnSidebarLoan = document.getElementById('btn-sidebar-loan');
const btnSidebarHelp = document.getElementById('btn-sidebar-help');
const btnSidebarProjects = document.getElementById('btn-sidebar-projects');
const btnBankClose = document.getElementById('btn-bank-close');
const btnHelpClose = document.getElementById('btn-help-close');
const btnProjectsClose = document.getElementById('btn-projects-close');

// Projects Modal Elements
const projectsOverlay = document.getElementById('projects-overlay');
const projectsListContainer = document.getElementById('projects-list-container');

// Bank Modal Elements
const bankUserCash = document.getElementById('bank-user-cash');
const bankUserDebt = document.getElementById('bank-user-debt');
const bankBaseInterest = document.getElementById('bank-base-interest');
const bankDailyRate = document.getElementById('bank-daily-rate');
const bankDailyCharge = document.getElementById('bank-daily-charge');
const btnBankBorrow = document.getElementById('btn-bank-borrow');
const btnBankRepay = document.getElementById('btn-bank-repay');
const bankPenaltyWarning = document.getElementById('bank-penalty-warning');
const projectedDebtPenalty = document.getElementById('projected-debt-penalty');

// Simulation Modal Elements
const simDayTitle = document.getElementById('sim-day-title');
const simPopulation = document.getElementById('sim-population');
const simAffluence = document.getElementById('sim-affluence');
const simRevenue = document.getElementById('sim-revenue');
const simServed = document.getElementById('sim-served');
const simLogsContainer = document.getElementById('sim-logs-container');
const btnNextDay = document.getElementById('btn-next-day');

// Endgame Elements
const endgameLeaderboard = document.getElementById('endgame-leaderboard');
const btnRestartGame = document.getElementById('btn-restart-game');

// Buy Offer Overlay Elements
const offerOverlay = document.getElementById('offer-overlay');
const offerPropertyDesc = document.getElementById('offer-property-desc');
const offerPropVal = document.getElementById('offer-prop-val');
const offerBuyerCash = document.getElementById('offer-buyer-cash');
const offerPriceInput = document.getElementById('offer-price-input');
const offerErrorMsg = document.getElementById('offer-error-msg');
const btnOfferSubmit = document.getElementById('btn-offer-submit');
const btnOfferCancel = document.getElementById('btn-offer-cancel');

// Offer Decision Overlay Elements
const decisionOverlay = document.getElementById('decision-overlay');
const decisionDesc = document.getElementById('decision-desc');
const decisionOfferPrice = document.getElementById('decision-offer-price');
const decisionPropValue = document.getElementById('decision-prop-value');
const decisionProfit = document.getElementById('decision-profit');
const btnDecisionAccept = document.getElementById('btn-decision-accept');
const btnDecisionReject = document.getElementById('btn-decision-reject');

// Notification Modal Elements
const notificationOverlay = document.getElementById('notification-overlay');
const notificationTitle = document.getElementById('notification-title');
const notificationMessage = document.getElementById('notification-message');
const btnNotificationClose = document.getElementById('btn-notification-close');
const notificationConfirmButtons = document.getElementById('notification-confirm-buttons');
const btnNotificationConfirm = document.getElementById('btn-notification-confirm');
const btnNotificationCancel = document.getElementById('btn-notification-cancel');

// Onboarding Elements
const onboardingOverlay = document.getElementById('onboarding-overlay');
const onboardingTitle = document.getElementById('onboarding-title');
const onboardingText = document.getElementById('onboarding-text');
const onboardingStepIndicator = document.getElementById('onboarding-step-indicator');
const btnOnboardingPrev = document.getElementById('btn-onboarding-prev');
const btnOnboardingNext = document.getElementById('btn-onboarding-next');
const btnOnboardingSkip = document.getElementById('btn-onboarding-skip');


// --- SETUP PHASE ---

function initSetupScreen() {
  renderPlayerSetupRows();

  playerCountSelect.addEventListener('change', renderPlayerSetupRows);

  btnStartGame.addEventListener('click', () => {
    startGame();
  });

  // Setup UI event listeners once on bootstrap
  setupTabListeners();
  setupHUDActionListeners();
}

function renderPlayerSetupRows() {
  const count = parseInt(playerCountSelect.value, 10);
  playerSetupContainer.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'player-setup-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'setup-input';
    nameInput.value = `Entrepreneur ${i + 1}`;
    nameInput.placeholder = `Player ${i + 1} Name`;
    nameInput.id = `player-name-${i}`;

    const colorPickerWrapper = document.createElement('div');
    colorPickerWrapper.className = 'color-picker-wrapper';

    const colorCircle = document.createElement('div');
    colorCircle.className = 'color-circle';
    colorCircle.style.backgroundColor = COLOR_PRESETS[i % COLOR_PRESETS.length];
    colorCircle.dataset.color = COLOR_PRESETS[i % COLOR_PRESETS.length];
    
    // Allow cycle colors on click
    colorCircle.addEventListener('click', () => {
      let currentIndex = COLOR_PRESETS.indexOf(colorCircle.dataset.color);
      let nextIndex = (currentIndex + 1) % COLOR_PRESETS.length;
      colorCircle.style.backgroundColor = COLOR_PRESETS[nextIndex];
      colorCircle.dataset.color = COLOR_PRESETS[nextIndex];
    });

    colorPickerWrapper.appendChild(colorCircle);
    row.appendChild(nameInput);
    row.appendChild(colorPickerWrapper);
    playerSetupContainer.appendChild(row);
  }
}

// --- HELPERS FOR MULTI-AGENCY/BANK SELECTION ---

function findBestAdAgency(player) {
  const agencies = properties.filter(p => p instanceof AdServices);
  if (agencies.length === 0) return null;

  // 1. Own agency
  const ownAgencies = agencies.filter(p => p.owner === player);
  if (ownAgencies.length > 0) {
    return ownAgencies.sort((a, b) => a.campaignPrice - b.campaignPrice)[0];
  }

  // 2. Cheapest other player-owned agency
  const otherOwnedAgencies = agencies.filter(p => p.owner && p.owner !== player);
  if (otherOwnedAgencies.length > 0) {
    return otherOwnedAgencies.sort((a, b) => a.campaignPrice - b.campaignPrice)[0];
  }

  // 3. Cheapest town-owned agency
  const townAgencies = agencies.filter(p => !p.owner);
  if (townAgencies.length > 0) {
    return townAgencies.sort((a, b) => a.campaignPrice - b.campaignPrice)[0];
  }

  return agencies[0];
}

function findBestBank(player) {
  const banks = properties.filter(p => p instanceof Bank);
  if (banks.length === 0) return null;
  // Sort by interestRate ascending
  return banks.sort((a, b) => a.interestRate - b.interestRate)[0];
}

// --- INITIALIZE GAME STATE ---

function startGame() {
  const count = parseInt(playerCountSelect.value, 10);
  maxDays = parseInt(gameLengthSelect.value, 10);
  const mapSize = document.getElementById('map-size').value;
  
  players = [];
  for (let i = 0; i < count; i++) {
    const name = document.getElementById(`player-name-${i}`).value || `Player ${i + 1}`;
    const colorCircle = playerSetupContainer.children[i].querySelector('.color-circle');
    const color = colorCircle.dataset.color;
    players.push(new Player(`p_${i}`, name, color, 50000));
  }

  // Setup properties
  if (mapSize === 'large') {
    canvas.width = 960;
    canvas.height = 600;
    properties = [
      // Farms (4)
      new Farm('prop_farm_1', 'Valley Organic Farm', 0, 0, 4, 3),
      new Farm('prop_farm_2', 'Green Meadow Farm', 35, 0, 4, 3),
      new Farm('prop_farm_3', 'Sunshine Ranch', 0, 20, 4, 3),
      new Farm('prop_farm_4', 'Golden Fields Agricultural', 35, 20, 4, 3),
      // Apartments (4)
      new Apartments('prop_apt_1', 'Horizon High-Rise', 5, 0, 4, 3),
      new Apartments('prop_apt_2', 'Sunset Gardens', 30, 0, 4, 3),
      new Apartments('prop_apt_3', 'Aero Lofts', 5, 20, 4, 3),
      new Apartments('prop_apt_4', 'Summit Residences', 30, 20, 4, 3),
      // Grocery Stores (4)
      new B2CProperty('prop_gro_1', 'Metro Grocers', 'GroceryStore', 0, 5, 4, 3),
      new B2CProperty('prop_gro_2', 'Corner Market', 'GroceryStore', 35, 5, 4, 3),
      new B2CProperty('prop_gro_3', 'Pinnacle Foods', 'GroceryStore', 15, 5, 4, 3),
      new B2CProperty('prop_gro_4', 'Sovereign Markets', 'GroceryStore', 20, 5, 4, 3),
      // Restaurants (4)
      new B2CProperty('prop_rest_1', 'Neon Diner', 'Restaurant', 5, 5, 4, 3),
      new B2CProperty('prop_rest_2', 'Eclipse Fusion Grill', 'Restaurant', 30, 5, 4, 3),
      new B2CProperty('prop_rest_3', 'Ambrosia Bistro', 'Restaurant', 5, 15, 4, 3),
      new B2CProperty('prop_rest_4', 'Lumina Gastropub', 'Restaurant', 30, 15, 4, 3),
      // Retail Stores (4)
      new B2CProperty('prop_ret_1', 'Aura Boutique', 'RetailStore', 10, 5, 4, 3),
      new B2CProperty('prop_ret_2', 'Vanguard Outfitters', 'RetailStore', 25, 5, 4, 3),
      new B2CProperty('prop_ret_3', 'Prism Luxury Goods', 'RetailStore', 10, 15, 4, 3),
      new B2CProperty('prop_ret_4', 'Apex Electronics', 'RetailStore', 25, 15, 4, 3),
      // Mechanic Shops (4)
      new B2CProperty('prop_mech_1', 'Vortex Garage', 'MechanicShop', 0, 15, 4, 3),
      new B2CProperty('prop_mech_2', 'Precision Auto Care', 'MechanicShop', 15, 20, 4, 3),
      new B2CProperty('prop_mech_3', 'Quantum Motors', 'MechanicShop', 20, 20, 4, 3),
      new B2CProperty('prop_mech_4', 'Titan Heavy Repair', 'MechanicShop', 35, 15, 4, 3),
      // Banks (4)
      new Bank('prop_bank_1', 'Union Reserve Bank', 15, 15, 4, 3),
      new Bank('prop_bank_2', 'Cascade Bank', 20, 15, 4, 3),
      new Bank('prop_bank_3', 'Apex Financial', 15, 0, 4, 3),
      new Bank('prop_bank_4', 'Summit Trust', 20, 10, 4, 3),
      // Ad Services (4)
      new AdServices('prop_ads_1', 'Zenith Marketing Group', 5, 10, 4, 3),
      new AdServices('prop_ads_2', 'Spectra Ad Agency', 25, 10, 4, 3),
      new AdServices('prop_ads_3', 'Nova Creative Group', 10, 10, 4, 3),
      new AdServices('prop_ads_4', 'Vanguard PR & Media', 30, 10, 4, 3),
    ];
  } else {
    canvas.width = 800;
    canvas.height = 600;
    properties = [
      new Farm('prop_farm_1', 'Valley Organic Farm', 0, 0, 4, 3),
      new Farm('prop_farm_2', 'Green Meadow Farm', 16, 4, 4, 3),
      new Apartments('prop_apt_1', 'Horizon High-Rise', 5, 0, 4, 3),
      new Apartments('prop_apt_2', 'Sunset Gardens', 16, 12, 4, 3),
      new B2CProperty('prop_gro_1', 'Metro Grocers', 'GroceryStore', 1, 4, 3, 3),
      new Bank('prop_bank', 'Union Reserve Bank', 5, 4, 3, 3),
      new Bank('prop_bank_2', 'Cascade Bank', 8, 12, 2, 3),
      new AdServices('prop_ads', 'Zenith Marketing Group', 11, 4, 3, 3),
      new B2CProperty('prop_gro_2', 'Corner Market', 'GroceryStore', 11, 8, 3, 3),
      new B2CProperty('prop_rest_1', 'Neon Diner', 'Restaurant', 5, 8, 3, 3),
      new B2CProperty('prop_rest_2', 'Eclipse Fusion Grill', 'Restaurant', 11, 12, 3, 3),
      new B2CProperty('prop_ret', 'Aura Boutique', 'RetailStore', 1, 8, 3, 3),
      new B2CProperty('prop_ret_2', 'Vanguard Outfitters', 'RetailStore', 8, 8, 2, 3),
      new B2CProperty('prop_mech', 'Vortex Garage', 'MechanicShop', 5, 12, 3, 3),
      new B2CProperty('prop_mech_2', 'Precision Auto Care', 'MechanicShop', 8, 4, 2, 3),
    ];
  }

  B2CProperty.allProperties = properties;

  town = new Town(mapSize === 'large' ? 450 : 150);
  town.maxDays = maxDays;
  currentPlayerIndex = 0;
  selectedProperty = null;

  // Initialize Map
  if (map) {
    map.destroy();
  }
  map = new Map(canvas, properties, (prop) => {
    selectedProperty = prop;
    updateUI();
  });
  map.town = town;

  // Hide Setup Screen and show Game Screen
  setupScreen.style.display = 'none';
  gameScreen.classList.add('active');

  // Trigger main animation draw loop
  if (!animationStarted) {
    animateMap();
    animationStarted = true;
  }

  startTurn(0);
  startOnboarding();
}

// Map Animation Render Loop
function animateMap() {
  if (map) {
    map.draw();
  }
  requestAnimationFrame(animateMap);
}

// --- TURN LOGIC & ROUND MANAGEMENT ---

function startTurn(playerIndex) {
  currentPlayerIndex = playerIndex;
  const player = players[currentPlayerIndex];

  // Update Turn banner style
  turnBanner.style.setProperty('--player-color', player.color);
  currentPlayerName.textContent = player.name;
  currentPlayerName.style.color = player.color;

  // Select first property by default or reset selected
  selectedProperty = null;

  updateUI();
}

function endCurrentPlayerTurn() {
  const player = players[currentPlayerIndex];
  if (player && player.pendingSaleCash > 0) {
    player.cash += player.pendingSaleCash;
    player.logTransaction('Property Sale Cash Received', player.pendingSaleCash, `Received cash from pending property sales`);
    player.pendingSaleCash = 0;
  }

  currentPlayerIndex++;

  if (currentPlayerIndex >= players.length) {
    // End of round: simulation phase!
    runSimulationPhase();
  } else {
    startTurn(currentPlayerIndex);
  }
}

function runSimulationPhase() {
  // Show simulation loader panel
  simulationOverlay.style.display = 'flex';
  setTimeout(() => simulationOverlay.classList.add('active'), 50);

  // Trigger map particle bursts to B2C properties visited
  properties.forEach(p => {
    if (p instanceof B2CProperty || p instanceof Apartments) {
      // Spawn particles based on approximate occupancy/customers served
      const density = p instanceof Apartments ? p.tenants : Math.min(5, Math.ceil(p.revenueToday / 50));
      if (density > 0) {
        map.spawnCustomerParticles(p, density * 2);
      }
    }
  });

  // Run day simulation calculations
  const log = town.simulateDay(properties, players);

  // Set modal text
  simDayTitle.textContent = `Results of Day ${log.day}`;
  simPopulation.textContent = log.populationAfter;
  simAffluence.textContent = log.affluenceAfter;
  simRevenue.textContent = `$${log.totalSales.toLocaleString()}`;
  simServed.textContent = log.totalCustomersServed;

  // Populate player breakdown
  const playerBreakdownContainer = document.getElementById('sim-player-breakdown');
  if (playerBreakdownContainer) {
    playerBreakdownContainer.innerHTML = '';
    players.forEach(p => {
      const metrics = log.playerMetrics[p.id] || { revenue: 0, cogs: 0, income: 0, customersServed: 0 };
      const row = document.createElement('div');
      row.className = 'glass';
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '8px 12px';
      row.style.borderRadius = '6px';
      row.style.borderLeft = `4px solid ${p.color}`;
      row.style.background = 'rgba(255, 255, 255, 0.03)';
      row.style.fontSize = '0.85rem';

      const cogs = metrics.cogs || 0;
      const income = metrics.income !== undefined ? metrics.income : (metrics.revenue - cogs);

      row.innerHTML = `
        <span style="font-weight:600; color:${p.color};">${p.name}</span>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px;">
          <div style="display:flex; gap:12px; font-size:0.8rem;">
            <span>Rev: <strong style="color:var(--accent-green);">$${metrics.revenue.toLocaleString()}</strong></span>
            <span>COGS: <strong style="color:var(--accent-pink);">$${cogs.toLocaleString()}</strong></span>
            <span>Income: <strong style="color:${income >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)'};">$${income.toLocaleString()}</strong></span>
          </div>
          <span style="font-size:0.75rem; color:var(--text-muted);">Served: <strong style="color:var(--text-main);">${metrics.customersServed}</strong></span>
        </div>
      `;
      playerBreakdownContainer.appendChild(row);
    });
  }

  // Log events
  simLogsContainer.innerHTML = '';
  if (log.events.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'sim-log-row';
    emptyRow.textContent = 'A calm day in the business sector.';
    simLogsContainer.appendChild(emptyRow);
  } else {
    log.events.forEach(evt => {
      const row = document.createElement('div');
      row.className = 'sim-log-row';
      row.textContent = evt;
      simLogsContainer.appendChild(row);
    });
  }
}

function proceedToNextDay() {
  // Hide simulation modal
  simulationOverlay.classList.remove('active');
  setTimeout(() => simulationOverlay.style.display = 'none', 300);

  if (town.day > maxDays) {
    // Game over: trigger leaderboard
    showEndgameScreen();
  } else {
    // Start next round from player 0
    startTurn(0);
  }
}

// --- UPDATE UI PANELS ---

function updateUI() {
  const player = players[currentPlayerIndex];
  if (!player) return;

  // 1. Update Top HUD
  hudDay.textContent = `${town.day} / ${maxDays}`;
  hudPopulation.textContent = town.population;
  hudAffluence.textContent = town.affluence;

  // 2. Update player sidebar stats
  if (player.pendingSaleCash > 0) {
    statCash.innerHTML = `$${player.cash.toLocaleString()} <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 500; display: block; margin-top: 2px;">(+$${player.pendingSaleCash.toLocaleString()} pending)</span>`;
  } else {
    statCash.textContent = `$${player.cash.toLocaleString()}`;
  }
  statDebt.textContent = `$${player.debt.toLocaleString()}`;
  
  const netWorth = player.getNetWorth(properties);
  statNetworth.textContent = `$${netWorth.toLocaleString()}`;

  // 3. Update tab containers
  renderPropertiesTab(player);
  renderSkillsTab(player);
  renderLedgerTab(player);

  // 4. Update Inspector panel
  renderInspectorPanel();
}

// Tabs switching logic
function setupTabListeners() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      activeTab = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(activeTab).classList.add('active');
    });
  });
}

function renderPropertiesTab(player) {
  playerPropertiesList.innerHTML = '';
  const owned = properties.filter(p => p.owner === player);

  if (owned.length === 0) {
    playerPropertiesList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:20px;">You do not own any properties. Click a property on the map to purchase.</div>`;
    return;
  }

  owned.forEach(prop => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.addEventListener('click', () => {
      selectedProperty = prop;
      map.selectedProperty = prop;
      updateUI();
    });

    let details = `Level ${prop.upgradeLevel}`;
    if (prop instanceof Apartments) details += ` • Rent: $${prop.rent}`;
    else if (prop instanceof Farm) details += ` • Wholesale: $${prop.wholesalePrice}`;
    else if (prop instanceof Bank) details += ` • Rate: ${(prop.interestRate * 100).toFixed(0)}%`;
    else if (prop instanceof B2CProperty) details += ` • Price: $${prop.price}`;

    card.innerHTML = `
      <div class="property-card-info">
        <div class="name">${prop.name}</div>
        <div class="desc">${details}</div>
      </div>
      <div class="property-card-val">
        <div class="val">$${prop.getValue().toLocaleString()}</div>
      </div>
    `;
    playerPropertiesList.appendChild(card);
  });
}

function renderSkillsTab(player) {
  playerSkillsList.innerHTML = '';
  
  const skillDetails = {
    technology: { title: 'Technology Upgrade', desc: 'Reduces equipment upgrade costs by 5% per level.' },
    social: { title: 'Social Relations', desc: 'Reduces interest rates and boosts satisfaction by 3% per level.' },
    planning: { title: 'Strategic Planning', desc: 'Lowers property costs and maintenance by 4% per level.' },
    marketing: { title: 'Viral Marketing', desc: 'Increases ad package effectiveness by 15% per level.' },
    management: { title: 'Business Management', desc: 'Lowers operational and employee overhead by 5% per level.' }
  };

  Object.keys(player.skills).forEach(skillName => {
    const level = player.skills[skillName];
    const cost = player.getSkillUpgradeCost(skillName);
    const detail = skillDetails[skillName];
    const canAfford = player.cash >= cost && level < 10;

    const row = document.createElement('div');
    row.className = 'skill-row';
    row.innerHTML = `
      <div class="skill-header">
        <span class="skill-name">${detail.title}</span>
        <span class="skill-level-text">Lvl ${level}/10</span>
      </div>
      <div class="skill-progress-bar">
        <div class="skill-progress-fill" style="width: ${level * 10}%"></div>
      </div>
      <div class="skill-footer">
        <div class="skill-desc">${detail.desc}</div>
        <button class="btn-upgrade-skill" ${canAfford ? '' : 'disabled'}>
          ${level >= 10 ? 'MAX' : `Upgrade: $${Math.round(cost).toLocaleString()}`}
        </button>
      </div>
    `;

    const upgradeBtn = row.querySelector('.btn-upgrade-skill');
    upgradeBtn.addEventListener('click', () => {
      if (player.upgradeSkill(skillName)) {
        updateUI();
      }
    });

    playerSkillsList.appendChild(row);
  });
}

function renderLedgerTab(player) {
  playerLedgerList.innerHTML = '';
  if (player.ledger.length === 0) {
    playerLedgerList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.85rem; padding:20px;">No transaction activities logged yet today.</div>`;
    return;
  }

  // Reverse copy to show newest first
  [...player.ledger].reverse().forEach(item => {
    const el = document.createElement('div');
    const isIncome = item.amount > 0;
    el.className = `ledger-item ${isIncome ? 'income' : 'expense'}`;
    el.innerHTML = `
      <div class="ledger-row">
        <span>${item.type}</span>
        <span class="ledger-amt">${isIncome ? '+' : ''}$${item.amount.toLocaleString()}</span>
      </div>
      <div class="ledger-desc">${item.description}</div>
    `;
    playerLedgerList.appendChild(el);
  });
}

// --- RENDER DYNAMIC PROPERTY INSPECTOR PANEL ---

function renderInspectorPanel() {
  if (!selectedProperty) {
    inspectorPanel.classList.remove('active');
    return;
  }

  const player = players[currentPlayerIndex];
  inspectorPanel.classList.add('active');

  // Headings
  inspName.textContent = selectedProperty.name;
  inspType.textContent = selectedProperty.type;

  if (selectedProperty.owner === player) {
    inspOwner.textContent = 'Owned by You';
    inspOwner.style.color = player.color;
  } else if (selectedProperty.owner) {
    inspOwner.textContent = `Owned by ${selectedProperty.owner.name}`;
    inspOwner.style.color = selectedProperty.owner.color;
  } else {
    inspOwner.textContent = 'Town Owned';
    inspOwner.style.color = 'var(--text-muted)';
  }

  // 1. Stats Grid
  inspStatsContainer.innerHTML = '';
  const addStatRow = (label, val) => {
    const lblSpan = document.createElement('span');
    lblSpan.className = 'inspector-stat-label';
    lblSpan.textContent = label;
    const valSpan = document.createElement('span');
    valSpan.className = 'inspector-stat-val';
    valSpan.textContent = val;
    inspStatsContainer.appendChild(lblSpan);
    inspStatsContainer.appendChild(valSpan);
  };

  addStatRow('Asset Value:', `$${selectedProperty.getValue().toLocaleString()}`);
  addStatRow('Maintenance / Day:', `$${selectedProperty.getMaintenanceCost().toLocaleString()}`);

  if (selectedProperty instanceof B2CProperty) {
    addStatRow('Capacity limit:', `${selectedProperty.customersServedLastSimulation} / ${selectedProperty.getCapacity()}`);
    addStatRow('Ad Awareness:', `${(selectedProperty.adAwareness * 100).toFixed(0)}%`);
    addStatRow('Satisfaction:', `${(selectedProperty.customerSatisfaction * 100).toFixed(0)}%`);
    if (selectedProperty.requiresGoods) {
      addStatRow('Raw Stock:', `${selectedProperty.rawGoodsInventory} units`);
    }
  } else if (selectedProperty instanceof Farm) {
    addStatRow('Wholesale Production:', `${40 + (selectedProperty.upgradeLevel - 1) * 20} units/day`);
    addStatRow('Available Stock:', `${selectedProperty.inventory} units`);
    addStatRow('Sold Last Simulation:', `${selectedProperty.unitsSoldLastSimulation} units`);
  } else if (selectedProperty instanceof Apartments) {
    addStatRow('Max Capacity:', `${selectedProperty.tenants} / ${selectedProperty.getMaxTenants()} tenants`);
  } else if (selectedProperty instanceof Bank) {
    addStatRow('Loans Issued:', `${selectedProperty.totalLoansIssued}`);
  }

  // 2. Custom actions forms (sliders, price selectors)
  inspCustomActions.innerHTML = '';
  
  if (selectedProperty.owner === player) {
    // Owner pricing adjustments
    const pricingContainer = document.createElement('div');
    pricingContainer.style.display = 'flex';
    pricingContainer.style.flexDirection = 'column';
    pricingContainer.style.gap = '6px';
    pricingContainer.style.width = '100%';

    const formRow = document.createElement('div');
    formRow.className = 'inspector-input-group';

    let label = 'Base Pricing:';
    let min = 0, max = 100, val = 0;

    if (selectedProperty instanceof B2CProperty) {
      label = 'Set Price ($):';
      val = selectedProperty.price;
      if (selectedProperty.type === 'GroceryStore') { min = 5; max = 80; }
      else if (selectedProperty.type === 'Restaurant') { min = 10; max = 150; }
      else if (selectedProperty.type === 'RetailStore') { min = 10; max = 100; }
      else if (selectedProperty.type === 'MechanicShop') { min = 15; max = 200; }
    } else if (selectedProperty instanceof Farm) {
      label = 'Wholesale Price ($):';
      val = selectedProperty.wholesalePrice;
      min = 8; max = 40;
    } else if (selectedProperty instanceof Apartments) {
      label = 'Daily Rent ($):';
      val = selectedProperty.rent;
      min = 5; max = 100;
    } else if (selectedProperty instanceof Bank) {
      label = 'Loan Interest (%):';
      val = Math.round(selectedProperty.interestRate * 100);
      min = 5; max = 50;
    } else if (selectedProperty instanceof AdServices) {
      label = 'Campaign Price ($):';
      val = selectedProperty.campaignPrice;
      min = 500; max = 5000;
    }

    formRow.innerHTML = `
      <label>${label}</label>
      <input type="range" class="inspector-slider" min="${min}" max="${max}" value="${val}">
      <span class="inspector-input-val">${selectedProperty instanceof Bank ? val + '%' : '$' + val}</span>
    `;

    const slider = formRow.querySelector('.inspector-slider');
    const valText = formRow.querySelector('.inspector-input-val');
    slider.addEventListener('input', () => {
      const sliderVal = parseInt(slider.value, 10);
      valText.textContent = selectedProperty instanceof Bank ? sliderVal + '%' : '$' + sliderVal;
      
      // Save changes immediately
      if (selectedProperty instanceof B2CProperty) selectedProperty.setPrice(sliderVal);
      else if (selectedProperty instanceof Farm) selectedProperty.setWholesalePrice(sliderVal);
      else if (selectedProperty instanceof Apartments) selectedProperty.setRent(sliderVal);
      else if (selectedProperty instanceof Bank) selectedProperty.setInterestRate(sliderVal / 100);
      else if (selectedProperty instanceof AdServices) selectedProperty.setCampaignPrice(sliderVal);
    });

    pricingContainer.appendChild(formRow);

    // Render benchmark and COGS info below the slider
    const infoRow = document.createElement('div');
    infoRow.style.fontSize = '0.72rem';
    infoRow.style.color = 'var(--text-muted)';
    infoRow.style.padding = '0 6px';
    infoRow.style.display = 'flex';
    infoRow.style.flexDirection = 'column';
    infoRow.style.gap = '4px';

    let rangeHtml = '';
    let cogsHtml = '';

    if (selectedProperty instanceof B2CProperty) {
      const benchmark = selectedProperty.benchmarkPrice;
      rangeHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>Min: $${min}</span>
          <span style="color: var(--accent-cyan); font-weight: 600;">Benchmark: $${benchmark}</span>
          <span>Max: $${max}</span>
        </div>
      `;

      if (selectedProperty.requiresGoods) {
        cogsHtml = `
          <div style="display: flex; justify-content: space-between; width: 100%; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px; margin-top: 2px;">
            <span>Current Stock Cost Basis (COGS):</span>
            <strong style="color: var(--accent-pink); font-weight: 600;">$${selectedProperty.averageUnitCost.toFixed(2)} / unit</strong>
          </div>
        `;
      }
    } else if (selectedProperty instanceof Farm) {
      rangeHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>Min: $${min}</span>
          <span style="color: var(--accent-cyan); font-weight: 600;">Default: $15</span>
          <span>Max: $${max}</span>
        </div>
      `;
      cogsHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px; margin-top: 2px;">
          <span>Production Cost (COGS):</span>
          <strong style="color: var(--accent-pink); font-weight: 600;">$${selectedProperty.getProductionCostPerUnit()} / unit</strong>
        </div>
      `;
    } else if (selectedProperty instanceof Apartments) {
      rangeHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>Min: $${min}</span>
          <span style="color: var(--accent-cyan); font-weight: 600;">Target Rent: $50</span>
          <span>Max: $${max}</span>
        </div>
      `;
    } else if (selectedProperty instanceof Bank) {
      rangeHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>Min: ${min}%</span>
          <span style="color: var(--accent-cyan); font-weight: 600;">Default Interest: 15%</span>
          <span>Max: ${max}%</span>
        </div>
      `;
    } else if (selectedProperty instanceof AdServices) {
      rangeHtml = `
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <span>Min: $${min}</span>
          <span style="color: var(--accent-cyan); font-weight: 600;">Default Campaign: $1,500</span>
          <span>Max: $${max}</span>
        </div>
      `;
    }

    infoRow.innerHTML = rangeHtml + cogsHtml;
    pricingContainer.appendChild(infoRow);
    inspCustomActions.appendChild(pricingContainer);

    // B2C Inventory Refueling Section
    if (selectedProperty instanceof B2CProperty && selectedProperty.requiresGoods) {
      const restockRow = document.createElement('div');
      restockRow.style.display = 'flex';
      restockRow.style.flexDirection = 'column';
      restockRow.style.gap = '5px';
      
      // Sort farms by wholesale price ascending; emergency imports always last
      const farms = properties.filter(p => p instanceof Farm);
      const sortedFarms = [...farms].sort((a, b) => a.wholesalePrice - b.wholesalePrice);

      let dropdownOptions = '';
      sortedFarms.forEach(f => {
        const farmOwnerText = f.owner ? (f.owner === player ? 'Your Farm' : f.owner.name) : 'Town Farm';
        dropdownOptions += `<option value="${f.id}">${f.name} (${farmOwnerText} - $${f.wholesalePrice}/unit)</option>`;
      });
      dropdownOptions += `<option value="market">Emergency Market Imports ($${selectedProperty.emergencyImportCost}/unit)</option>`;

      let autoDropdownOptions = '';
      sortedFarms.forEach(f => {
        const farmOwnerText = f.owner ? (f.owner === player ? 'Your Farm' : f.owner.name) : 'Town Farm';
        const isSelected = selectedProperty.autoPurchaseSource === f.id ? 'selected' : '';
        autoDropdownOptions += `<option value="${f.id}" ${isSelected}>${f.name} (${farmOwnerText} - $${f.wholesalePrice}/unit)</option>`;
      });
      const isMarketSelected = selectedProperty.autoPurchaseSource === 'market' ? 'selected' : '';
      autoDropdownOptions += `<option value="market" ${isMarketSelected}>Emergency Market Imports ($${selectedProperty.emergencyImportCost}/unit)</option>`;

      restockRow.innerHTML = `
        <div class="inspector-input-group" style="margin-top: 5px;">
          <label>Restock Source:</label>
          <select id="restock-source-select" class="setup-select" style="width: 150px; padding: 4px 8px; font-size: 0.8rem;">
            ${dropdownOptions}
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button id="btn-restock-20" class="btn-action">Buy 20 Units</button>
          <button id="btn-restock-50" class="btn-action">Buy 50 Units</button>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 0.8rem; font-weight: 600;">Auto-Purchase Each Turn</label>
            <input type="checkbox" id="chk-auto-purchase" ${selectedProperty.autoPurchaseEnabled ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
          </div>
          <div id="auto-purchase-controls" style="display: ${selectedProperty.autoPurchaseEnabled ? 'flex' : 'none'}; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <label style="font-size: 0.75rem; color: var(--text-muted);">Auto Source:</label>
              <select id="auto-purchase-source-select" class="setup-select" style="width: 150px; padding: 4px 8px; font-size: 0.8rem;">
                ${autoDropdownOptions}
              </select>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <label style="font-size: 0.75rem; color: var(--text-muted);">Auto Amount:</label>
              <input type="number" id="auto-purchase-amount-input" class="setup-input" style="width: 70px; padding: 4px 8px; font-size: 0.8rem; text-align: center; border-radius: 4px;" min="5" max="200" step="5" value="${selectedProperty.autoPurchaseAmount}">
            </div>
          </div>
        </div>
      `;

      const sourceSelect = restockRow.querySelector('#restock-source-select');
      const buy20Btn = restockRow.querySelector('#btn-restock-20');
      const buy50Btn = restockRow.querySelector('#btn-restock-50');

      const chkAuto = restockRow.querySelector('#chk-auto-purchase');
      const autoControls = restockRow.querySelector('#auto-purchase-controls');
      const autoSourceSelect = restockRow.querySelector('#auto-purchase-source-select');
      const autoAmountInput = restockRow.querySelector('#auto-purchase-amount-input');

      chkAuto.addEventListener('change', () => {
        selectedProperty.autoPurchaseEnabled = chkAuto.checked;
        autoControls.style.display = chkAuto.checked ? 'flex' : 'none';
      });

      autoSourceSelect.addEventListener('change', () => {
        selectedProperty.autoPurchaseSource = autoSourceSelect.value;
      });

      autoAmountInput.addEventListener('change', () => {
        let val = parseInt(autoAmountInput.value, 10);
        if (isNaN(val) || val < 1) val = 5;
        autoAmountInput.value = val;
        selectedProperty.autoPurchaseAmount = val;
      });

      const triggerRestock = (qty) => {
        const sourceVal = sourceSelect.value;
        if (sourceVal === 'market') {
          // Emergency buy
          const totalCost = qty * selectedProperty.emergencyImportCost;
          if (player.cash >= totalCost) {
            player.cash -= totalCost;
            selectedProperty.addToInventory(qty, selectedProperty.emergencyImportCost);
            player.logTransaction('Emergency Import Restock', -totalCost, `Imported ${qty} goods for ${selectedProperty.name}`);
            updateUI();
          } else {
            showNotification("Insufficient cash for emergency imports!", "Insufficient Funds", "error");
          }
        } else {
          // Buy from farm
          const farm = properties.find(p => p.id === sourceVal);
          if (farm) {
            const avail = Math.min(qty, farm.inventory);
            if (avail <= 0) {
              showNotification("The farm does not have any goods in stock!", "Out of Stock", "warning");
              return;
            }
            const totalCost = avail * farm.wholesalePrice;
            const isOwnFarm = farm.owner === player;
            if (isOwnFarm || player.cash >= totalCost) {
              const bought = selectedProperty.restockFromFarm(farm, avail);
              if (bought > 0) {
                updateUI();
              }
            } else {
              showNotification("Insufficient cash for wholesale purchase!", "Insufficient Funds", "error");
            }
          }
        }
      };

      buy20Btn.addEventListener('click', () => triggerRestock(20));
      buy50Btn.addEventListener('click', () => triggerRestock(50));
      inspCustomActions.appendChild(restockRow);
    }
  }

  // 3. Main buttons (Buy, Upgrade, Buy Marketing Campaign)
  inspButtonsContainer.innerHTML = '';

  if (selectedProperty.owner === null) {
    // Unowned property - Buy button
    const price = selectedProperty.getPurchasePrice(player);
    const canAfford = player.cash >= price;

    const buyBtn = document.createElement('button');
    buyBtn.className = 'btn-action buy';
    buyBtn.disabled = !canAfford;
    buyBtn.textContent = `Buy Property: $${price.toLocaleString()}`;
    buyBtn.addEventListener('click', () => {
      if (selectedProperty.purchase(player, town.day)) {
        updateUI();
      }
    });
    inspButtonsContainer.appendChild(buyBtn);
  } else if (selectedProperty.owner === player) {
    // Owned property - Upgrade button & marketing campaigns
    const level = selectedProperty.upgradeLevel;
    const upgradeCost = Math.round(selectedProperty.getUpgradeCost() * (1 - player.getTechnologyModifier()));
    const canUpgrade = player.cash >= upgradeCost && level < 5;

    const upgradeBtn = document.createElement('button');
    upgradeBtn.className = 'btn-action buy';
    upgradeBtn.disabled = !canUpgrade;
    upgradeBtn.textContent = level >= 5 ? 'MAX LEVEL REACHED' : `Upgrade Building: $${upgradeCost.toLocaleString()}`;
    upgradeBtn.addEventListener('click', () => {
      if (selectedProperty.upgrade(player)) {
        updateUI();
      }
    });
    inspButtonsContainer.appendChild(upgradeBtn);

    // Sell to Bank button
    const sellVal = selectedProperty.getValue();
    const sellBtn = document.createElement('button');
    sellBtn.className = 'btn-action sell';
    
    // Check if property is locked from selling (first 5 days after purchase)
    const daysSincePurchase = selectedProperty.purchaseDay !== null ? (town.day - selectedProperty.purchaseDay) : 5;
    const canSell = daysSincePurchase >= 5;
    
    if (!canSell) {
      sellBtn.disabled = true;
      const daysLeft = 5 - daysSincePurchase;
      sellBtn.textContent = `Locked: Sell to Bank in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
    } else {
      sellBtn.textContent = `Sell to Bank: $${sellVal.toLocaleString()}`;
    }
    
    sellBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm(
        `Are you sure you want to sell ${selectedProperty.name} to the Bank for $${sellVal.toLocaleString()}?\nThis will revert ownership, clear all upgrades, and the cash will be provided at the end of your turn.`,
        "Sell to Bank"
      );
      if (confirmed) {
        player.pendingSaleCash += sellVal;
        player.logTransaction('Property Sale (Pending)', sellVal, `Sold ${selectedProperty.name} to the bank (Cash pending end of turn)`);
        if (!selectedProperty.soldToBankBy.includes(player.id)) {
          selectedProperty.soldToBankBy.push(player.id);
        }
        selectedProperty.reset();
        selectedProperty = null;
        map.selectedProperty = null;
        updateUI();
      }
    });
    inspButtonsContainer.appendChild(sellBtn);

    // If B2C, add marketing campaign packages
    if (selectedProperty instanceof B2CProperty) {
      // Find AdServices player or use default town agency
      const adAgency = findBestAdAgency(player);
      const adCost = adAgency ? adAgency.campaignPrice : 1500;
      const canAffordAd = player.cash >= adCost;

      const adBtn = document.createElement('button');
      adBtn.className = 'btn-action';
      adBtn.disabled = !canAffordAd;
      
      const agencyText = adAgency && adAgency.owner ? `Agency (${adAgency.owner.name})` : 'Town Agency';
      adBtn.textContent = `Buy Ad Campaign: $${adCost.toLocaleString()} via ${agencyText}`;
      adBtn.addEventListener('click', () => {
        if (adAgency) {
          if (adAgency.sellCampaign(selectedProperty, player)) {
            updateUI();
          }
        }
      });
      inspButtonsContainer.appendChild(adBtn);
    }
  } else {
    // Owned by another player
    const descText = document.createElement('div');
    descText.style.textAlign = 'center';
    descText.style.fontSize = '0.8rem';
    descText.style.color = 'var(--text-muted)';
    descText.style.marginBottom = '8px';
    descText.textContent = `Property is currently operated by ${selectedProperty.owner.name}.`;
    inspButtonsContainer.appendChild(descText);

    // Make Buy Offer button
    const makeOfferBtn = document.createElement('button');
    makeOfferBtn.className = 'btn-action buy';
    makeOfferBtn.textContent = `Make Buy Offer`;
    
    const propVal = selectedProperty.getValue();
    makeOfferBtn.disabled = player.cash <= propVal;
    
    makeOfferBtn.addEventListener('click', () => {
      offerPropertyDesc.textContent = `Property: ${selectedProperty.name} (Owned by ${selectedProperty.owner.name})`;
      offerPropVal.textContent = `$${propVal.toLocaleString()}`;
      offerBuyerCash.textContent = `$${player.cash.toLocaleString()}`;
      offerPriceInput.value = propVal + 1000;
      offerErrorMsg.style.display = 'none';

      offerOverlay.style.display = 'flex';
      setTimeout(() => {
        offerOverlay.classList.add('active');
      }, 50);
    });
    inspButtonsContainer.appendChild(makeOfferBtn);
  }
}

// --- HUD BUTTON ACTIONS & BANK SERVICES ---

function setupHUDActionListeners() {
  btnEndTurn.addEventListener('click', () => {
    endCurrentPlayerTurn();
  });

  btnSidebarLoan.addEventListener('click', () => {
    openBankOverlay();
  });

  btnSidebarHelp.addEventListener('click', () => {
    helpOverlay.style.display = 'flex';
    setTimeout(() => helpOverlay.classList.add('active'), 50);
  });

  btnBankClose.addEventListener('click', () => {
    closeBankOverlay();
  });

  btnHelpClose.addEventListener('click', () => {
    helpOverlay.classList.remove('active');
    setTimeout(() => helpOverlay.style.display = 'none', 300);
  });

  btnSidebarProjects.addEventListener('click', () => {
    openProjectsOverlay();
  });

  btnProjectsClose.addEventListener('click', () => {
    closeProjectsOverlay();
  });

  btnNextDay.addEventListener('click', () => {
    proceedToNextDay();
  });

  btnRestartGame.addEventListener('click', () => {
    endgameScreen.classList.remove('active');
    setTimeout(() => {
      endgameScreen.style.display = 'none';
      setupScreen.style.display = 'flex';
    }, 500);
  });

  btnNotificationClose.addEventListener('click', () => {
    closeNotification();
  });

  // Bank Borrow and Repay logic
  btnBankBorrow.addEventListener('click', () => {
    const player = players[currentPlayerIndex];
    const bankProp = findBestBank(player);
    const baseRate = bankProp ? bankProp.interestRate : 0.18;

    const adjustedRate = player.borrow(10000, baseRate);
    
    if (bankProp) {
      bankProp.totalLoansIssued++;
    }

    updateUI();
    updateBankOverlayUI(player, bankProp);
  });

  btnBankRepay.addEventListener('click', () => {
    const player = players[currentPlayerIndex];
    const bankProp = findBestBank(player);

    player.repayDebt(10000);
    updateUI();
    updateBankOverlayUI(player, bankProp);
  });

  // Buy Offer Cancel logic
  btnOfferCancel.addEventListener('click', () => {
    offerOverlay.classList.remove('active');
    setTimeout(() => {
      offerOverlay.style.display = 'none';
    }, 300);
  });

  // Buy Offer Submit logic
  btnOfferSubmit.addEventListener('click', () => {
    const player = players[currentPlayerIndex];
    if (!selectedProperty || !player) return;

    const offerPrice = parseInt(offerPriceInput.value, 10);
    if (isNaN(offerPrice) || offerPrice <= 0) {
      offerErrorMsg.textContent = 'Please enter a valid positive number.';
      offerErrorMsg.style.display = 'block';
      return;
    }

    const propValue = selectedProperty.getValue();
    if (offerPrice <= propValue) {
      offerErrorMsg.textContent = `Offer must be strictly higher than the property value of $${propValue.toLocaleString()}.`;
      offerErrorMsg.style.display = 'block';
      return;
    }

    if (offerPrice > player.cash) {
      offerErrorMsg.textContent = `You do not have enough cash (current cash: $${player.cash.toLocaleString()}).`;
      offerErrorMsg.style.display = 'block';
      return;
    }

    // Hide error
    offerErrorMsg.style.display = 'none';

    // Set pending offer details
    pendingOffer = {
      property: selectedProperty,
      buyer: player,
      seller: selectedProperty.owner,
      price: offerPrice
    };

    // Close offer overlay and open decision overlay
    offerOverlay.classList.remove('active');
    setTimeout(() => {
      offerOverlay.style.display = 'none';

      // Prepare decision details
      decisionDesc.textContent = `${player.name} is offering to buy "${selectedProperty.name}" (with all upgrades) from you.`;
      decisionOfferPrice.textContent = `$${offerPrice.toLocaleString()}`;
      decisionPropValue.textContent = `$${propValue.toLocaleString()}`;
      
      const profit = offerPrice - propValue;
      decisionProfit.textContent = `$${profit.toLocaleString()}`;

      // Open decision overlay
      decisionOverlay.style.display = 'flex';
      setTimeout(() => {
        decisionOverlay.classList.add('active');
      }, 50);
    }, 300);
  });

  // Offer Decision Accept logic
  btnDecisionAccept.addEventListener('click', () => {
    if (!pendingOffer) return;

    const { property, buyer, seller, price } = pendingOffer;

    // Verify cash again just in case
    if (buyer.cash < price) {
      pendingOffer = null;
      decisionOverlay.classList.remove('active');
      setTimeout(() => {
        decisionOverlay.style.display = 'none';
        showNotification("Buyer no longer has enough cash to complete this offer.", "Transaction Failed", "error");
        updateUI();
      }, 300);
      return;
    }

    // Transfer cash
    buyer.cash -= price;
    seller.cash += price;

    // Log transactions
    buyer.logTransaction('Property Purchase (Offer)', -price, `Bought ${property.name} from ${seller.name}`);
    seller.logTransaction('Property Sale (Offer)', price, `Sold ${property.name} to ${buyer.name}`);

    // Transfer ownership
    property.owner = buyer;
    property.purchaseDay = town.day;
    if (property.soldToBankBy) {
      const idx = property.soldToBankBy.indexOf(buyer.id);
      if (idx !== -1) {
        property.soldToBankBy.splice(idx, 1);
      }
    }

    // Reset auto-purchase configs for B2CProperties to avoid issues
    if (property instanceof B2CProperty) {
      property.autoPurchaseEnabled = false;
      property.autoPurchaseSource = 'market';
    }

    // Update active property selections
    selectedProperty = property;
    map.selectedProperty = property;

    pendingOffer = null;

    decisionOverlay.classList.remove('active');
    setTimeout(() => {
      decisionOverlay.style.display = 'none';
      updateUI();
    }, 300);
  });

  // Offer Decision Reject logic
  btnDecisionReject.addEventListener('click', () => {
    if (!pendingOffer) return;

    const sellerName = pendingOffer.seller.name;
    pendingOffer = null;

    decisionOverlay.classList.remove('active');
    setTimeout(() => {
      decisionOverlay.style.display = 'none';
      showNotification(`Offer rejected by ${sellerName}.`, "Offer Rejected", "warning");
      updateUI();
    }, 300);
  });

  // Onboarding action listeners
  btnOnboardingPrev.addEventListener('click', () => {
    showOnboardingStep(currentOnboardingStep - 1);
  });

  btnOnboardingNext.addEventListener('click', () => {
    showOnboardingStep(currentOnboardingStep + 1);
  });

  btnOnboardingSkip.addEventListener('click', () => {
    closeOnboarding();
  });
}

// --- ONBOARDING FLOW LOGIC ---

function selectTab(tabName) {
  const tab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (tab && !tab.classList.contains('active')) {
    tab.click();
  }
}

const onboardingSteps = [
  {
    title: "Welcome to Entrepreneur!",
    text: "Your core objective is to <strong>achieve the highest Net Worth</strong> (Cash + Asset Value - Debt) at the end of the day limit.<br><br>Keep an eye on this panel to track your progress and financial health.",
    target: ".financials",
    action: () => selectTab('tab-properties')
  },
  {
    title: "Leverage Bank Services",
    text: "Need capital to buy properties or fund expansion? Use <strong>Bank Services</strong> to borrow cash in increments of $10,000.<br><br><span style='color: var(--accent-pink); font-weight: bold;'>⚠️ Warning:</span> Loans accrue daily interest. Any unpaid debt at the end of the match will incur a <strong>20% Net Worth penalty</strong>!",
    target: "#btn-sidebar-loan",
    action: () => selectTab('tab-properties')
  },
  {
    title: "Master Your Skills",
    text: "Upgrade your entrepreneur skills to operate more efficiently!<br><br>• <strong>Strategic Planning</strong> lowers property purchase prices and maintenance, making assets cheaper to buy and run.<br>• <strong>Technology Upgrade</strong> reduces building upgrade costs, allowing you to level up properties for less!",
    target: ".tab-btn[data-tab='tab-skills']",
    action: () => selectTab('tab-skills')
  },
  {
    title: "Entrepreneur's Guide",
    text: "If you ever need to check pricing benchmarks, consumer need weights, or supply chain rules, click the <strong>Guide</strong> button to read the rules.<br><br>You are ready to begin your business journey. Good luck!",
    target: "#btn-sidebar-help",
    action: () => selectTab('tab-properties')
  }
];

function startOnboarding() {
  currentOnboardingStep = 0;
  onboardingOverlay.style.display = 'flex';
  setTimeout(() => {
    onboardingOverlay.classList.add('active');
  }, 50);
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.add('onboarding-sidebar-active');
  }
  showOnboardingStep(0);
}

function showOnboardingStep(index) {
  document.querySelectorAll('.onboarding-highlight').forEach(el => {
    el.classList.remove('onboarding-highlight');
  });

  if (index < 0 || index >= onboardingSteps.length) {
    closeOnboarding();
    return;
  }

  currentOnboardingStep = index;
  const step = onboardingSteps[index];

  onboardingTitle.textContent = step.title;
  onboardingText.innerHTML = step.text;
  onboardingStepIndicator.textContent = `Step ${index + 1} of ${onboardingSteps.length}`;

  if (step.action) {
    step.action();
  }

  const targetEl = document.querySelector(step.target);
  if (targetEl) {
    targetEl.classList.add('onboarding-highlight');
  }

  btnOnboardingPrev.style.display = index === 0 ? 'none' : 'block';
  btnOnboardingNext.textContent = index === onboardingSteps.length - 1 ? "Let's Go!" : "Next";
}

function closeOnboarding() {
  document.querySelectorAll('.onboarding-highlight').forEach(el => {
    el.classList.remove('onboarding-highlight');
  });

  onboardingOverlay.classList.remove('active');
  setTimeout(() => {
    onboardingOverlay.style.display = 'none';
  }, 300);

  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('onboarding-sidebar-active');
  }

  selectTab('tab-properties');
}

function openProjectsOverlay() {
  renderProjectsOverlay();
  projectsOverlay.style.display = 'flex';
  setTimeout(() => projectsOverlay.classList.add('active'), 50);
}

function closeProjectsOverlay() {
  projectsOverlay.classList.remove('active');
  setTimeout(() => projectsOverlay.style.display = 'none', 300);
}

function renderProjectsOverlay() {
  const player = players[currentPlayerIndex];
  if (!player) return;

  projectsListContainer.innerHTML = '';
  
  town.developmentManager.projects.forEach(p => {
    const card = document.createElement('div');
    card.className = 'glass';
    card.style.padding = '15px';
    card.style.borderRadius = '10px';
    card.style.border = '1px solid var(--border-light)';
    card.style.background = 'rgba(255, 255, 255, 0.02)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';

    const percent = Math.min(100, Math.round((p.fundedAmount / p.cost) * 100));
    
    // Status Text and Color
    let statusText = 'Inactive';
    let statusColor = 'var(--text-muted)';
    
    if (p.type === 'permanent') {
      if (p.isCompleted) {
        statusText = 'Completed (Permanent)';
        statusColor = 'var(--accent-gold)';
      } else if (p.fundedAmount > 0) {
        statusText = `Funding: $${p.fundedAmount.toLocaleString()} / $${p.cost.toLocaleString()} (${percent}%)`;
        statusColor = 'var(--accent-cyan)';
      }
    } else {
      if (p.activeDaysLeft > 0) {
        statusText = `Active (${p.activeDaysLeft} days remaining)`;
        statusColor = 'var(--accent-green)';
      } else if (p.fundedAmount > 0) {
        statusText = `Funding: $${p.fundedAmount.toLocaleString()} / $${p.cost.toLocaleString()} (${percent}%)`;
        statusColor = 'var(--accent-cyan)';
      }
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="font-size: 1rem; color: #ffffff;">${p.name}</strong>
        <span style="font-size: 0.8rem; font-weight: 600; color: ${statusColor};">${statusText}</span>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4; margin: 2px 0;">${p.description}</p>
      
      <!-- Progress Bar -->
      <div style="height: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden; margin: 4px 0;">
        <div style="height: 100%; width: ${percent}%; background: linear-gradient(90deg, var(--accent-green) 0%, var(--accent-cyan) 100%); transition: width 0.3s;"></div>
      </div>
    `;

    // Only render contribution actions if project is not active / completed
    const isActivePermanent = p.type === 'permanent' && p.isCompleted;
    const isActiveTemporary = p.type === 'temporary' && p.activeDaysLeft > 0;
    
    if (!isActivePermanent && !isActiveTemporary) {
      const actionsRow = document.createElement('div');
      actionsRow.style.display = 'flex';
      actionsRow.style.gap = '8px';
      actionsRow.style.marginTop = '4px';

      const contribs = [1000, 5000];
      contribs.forEach(amount => {
        const btn = document.createElement('button');
        btn.className = 'btn-action';
        btn.style.flex = '1';
        btn.style.padding = '6px';
        btn.style.fontSize = '0.8rem';
        
        const remaining = p.cost - p.fundedAmount;
        const contribAmt = Math.min(amount, remaining);
        btn.textContent = `+ $${contribAmt.toLocaleString()}`;
        
        btn.disabled = player.cash < contribAmt || remaining <= 0;
        btn.addEventListener('click', () => {
          town.developmentManager.contributeToProject(p.id, contribAmt, player, town);
          updateUI();
          renderProjectsOverlay();
        });
        actionsRow.appendChild(btn);
      });

      // Max contribution button
      const btnMax = document.createElement('button');
      btnMax.className = 'btn-action buy';
      btnMax.style.flex = '1';
      btnMax.style.padding = '6px';
      btnMax.style.fontSize = '0.8rem';
      
      const maxRemaining = p.cost - p.fundedAmount;
      const maxContrib = Math.min(player.cash, maxRemaining);
      btnMax.textContent = `+ Max ($${maxContrib.toLocaleString()})`;
      
      btnMax.disabled = maxContrib <= 0;
      btnMax.addEventListener('click', () => {
        town.developmentManager.contributeToProject(p.id, maxContrib, player, town);
        updateUI();
        renderProjectsOverlay();
      });
      actionsRow.appendChild(btnMax);

      card.appendChild(actionsRow);

      // --- JOINT VENTURE SECTION ---
      const jvDivider = document.createElement('hr');
      jvDivider.style.border = 'none';
      jvDivider.style.borderTop = '1px dashed rgba(255, 255, 255, 0.1)';
      jvDivider.style.margin = '12px 0 8px 0';
      card.appendChild(jvDivider);

      const jvContainer = document.createElement('div');
      jvContainer.style.display = 'flex';
      jvContainer.style.flexDirection = 'column';
      jvContainer.style.gap = '8px';

      if (!p.jvActive) {
        // Show Propose Joint Venture button
        const btnPropose = document.createElement('button');
        btnPropose.className = 'btn-action';
        btnPropose.style.background = 'rgba(0, 242, 254, 0.08)';
        btnPropose.style.borderColor = 'var(--accent-cyan)';
        btnPropose.style.color = 'var(--accent-cyan)';
        btnPropose.style.fontWeight = '600';
        btnPropose.style.padding = '8px';
        btnPropose.style.fontSize = '0.85rem';
        btnPropose.textContent = '🤝 Propose Joint Venture';
        btnPropose.addEventListener('click', () => {
          p.startJointVenture();
          renderProjectsOverlay();
        });
        jvContainer.appendChild(btnPropose);
      } else {
        // Show Joint Venture Panel
        const jvPanel = document.createElement('div');
        jvPanel.style.background = 'rgba(0, 242, 254, 0.03)';
        jvPanel.style.border = '1px solid rgba(0, 242, 254, 0.15)';
        jvPanel.style.borderRadius = '8px';
        jvPanel.style.padding = '10px';
        jvPanel.style.display = 'flex';
        jvPanel.style.flexDirection = 'column';
        jvPanel.style.gap = '8px';

        const jvHeader = document.createElement('div');
        jvHeader.style.display = 'flex';
        jvHeader.style.justifyContent = 'space-between';
        jvHeader.style.alignItems = 'center';
        jvHeader.innerHTML = `
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 4px;">
            🤝 Joint Venture Setup
          </span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">Minimum 2 players</span>
        `;
        jvPanel.appendChild(jvHeader);

        const remaining = p.cost - p.fundedAmount;
        const participantCount = p.jvParticipants.length;
        const share = participantCount > 0 ? Math.ceil(remaining / participantCount) : remaining;

        let hasFundingError = false;

        // Player rows
        players.forEach(pl => {
          const isParticipant = p.jvParticipants.includes(pl.id);
          const method = p.jvFundingMethods[pl.id] || 'cash';
          const canAffordCash = pl.cash >= share;
          const isCash = method === 'cash';
          const hasError = isParticipant && isCash && !canAffordCash;
          if (hasError) {
            hasFundingError = true;
          }

          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.flexDirection = 'column';
          row.style.gap = '4px';
          row.style.padding = '6px';
          row.style.borderRadius = '6px';
          row.style.background = isParticipant ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
          row.style.border = isParticipant ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent';

          const mainInfo = document.createElement('div');
          mainInfo.style.display = 'flex';
          mainInfo.style.alignItems = 'center';
          mainInfo.style.justifyContent = 'space-between';
          mainInfo.style.gap = '8px';

          // Checkbox + Name Label
          const labelDiv = document.createElement('div');
          labelDiv.style.display = 'flex';
          labelDiv.style.alignItems = 'center';
          labelDiv.style.gap = '8px';

          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.style.cursor = 'pointer';
          chk.checked = isParticipant;
          chk.addEventListener('change', () => {
            p.toggleJvParticipant(pl.id);
            renderProjectsOverlay();
          });

          const nameSpan = document.createElement('span');
          nameSpan.style.fontSize = '0.8rem';
          nameSpan.style.fontWeight = '600';
          nameSpan.style.color = pl.color;
          nameSpan.textContent = pl.name + (pl === player ? ' (You)' : '');

          labelDiv.appendChild(chk);
          labelDiv.appendChild(nameSpan);
          mainInfo.appendChild(labelDiv);

          // Cash display
          const cashSpan = document.createElement('span');
          cashSpan.style.fontSize = '0.75rem';
          cashSpan.style.color = 'var(--text-muted)';
          cashSpan.textContent = `Cash: $${pl.cash.toLocaleString()}`;
          mainInfo.appendChild(cashSpan);

          row.appendChild(mainInfo);

          if (isParticipant) {
            const controlsDiv = document.createElement('div');
            controlsDiv.style.display = 'flex';
            controlsDiv.style.alignItems = 'center';
            controlsDiv.style.justifyContent = 'space-between';
            controlsDiv.style.gap = '8px';
            controlsDiv.style.marginTop = '4px';

            const select = document.createElement('select');
            select.className = 'setup-select';
            select.style.flex = '1';
            select.style.padding = '2px 6px';
            select.style.fontSize = '0.75rem';
            select.style.borderRadius = '4px';
            select.innerHTML = `
              <option value="cash" ${isCash ? 'selected' : ''}>Cash - $${share.toLocaleString()}</option>
              <option value="loan" ${method === 'loan' ? 'selected' : ''}>Project Loan - $${share.toLocaleString()}</option>
            `;
            select.addEventListener('change', (e) => {
              p.setJvFundingMethod(pl.id, e.target.value);
              renderProjectsOverlay();
            });

            controlsDiv.appendChild(select);

            if (hasError) {
              const errSpan = document.createElement('span');
              errSpan.style.fontSize = '0.7rem';
              errSpan.style.color = 'var(--accent-pink)';
              errSpan.style.fontWeight = '700';
              errSpan.textContent = '⚠️ Insufficient Cash';
              controlsDiv.appendChild(errSpan);
            } else if (method === 'loan') {
              const infoSpan = document.createElement('span');
              infoSpan.style.fontSize = '0.7rem';
              infoSpan.style.color = 'var(--accent-green)';
              infoSpan.style.fontWeight = '700';
              infoSpan.textContent = '✓ No Cap Limit';
              controlsDiv.appendChild(infoSpan);
            }

            row.appendChild(controlsDiv);
          }

          jvPanel.appendChild(row);
        });

        // Summary Line
        const jvSummary = document.createElement('div');
        jvSummary.style.fontSize = '0.75rem';
        jvSummary.style.color = 'var(--text-muted)';
        jvSummary.style.textAlign = 'center';
        jvSummary.style.marginTop = '4px';
        jvSummary.style.padding = '4px 0';
        jvSummary.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
        if (participantCount >= 2) {
          jvSummary.innerHTML = `Each pays <strong style="color: #ffffff;">$${share.toLocaleString()}</strong> (${participantCount} players participating)`;
        } else {
          jvSummary.innerHTML = `<span style="color: var(--accent-pink);">Need at least 2 players to agree.</span>`;
        }
        jvPanel.appendChild(jvSummary);

        // Action buttons
        const actionRow = document.createElement('div');
        actionRow.style.display = 'flex';
        actionRow.style.gap = '8px';

        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn-action';
        btnCancel.style.flex = '1';
        btnCancel.style.padding = '6px';
        btnCancel.style.fontSize = '0.8rem';
        btnCancel.textContent = 'Cancel';
        btnCancel.addEventListener('click', () => {
          p.cancelJointVenture();
          renderProjectsOverlay();
        });

        const btnExecute = document.createElement('button');
        btnExecute.className = 'btn-action buy';
        btnExecute.style.flex = '2';
        btnExecute.style.padding = '6px';
        btnExecute.style.fontSize = '0.8rem';
        btnExecute.textContent = 'Execute Venture';
        btnExecute.disabled = participantCount < 2 || hasFundingError;
        btnExecute.addEventListener('click', () => {
          if (p.executeJointVenture(players, town)) {
            updateUI();
            renderProjectsOverlay();
            showNotification(`Joint Venture successfully funded and completed for ${p.name}!`, "Venture Complete", "success");
          }
        });

        actionRow.appendChild(btnCancel);
        actionRow.appendChild(btnExecute);
        jvPanel.appendChild(actionRow);

        jvContainer.appendChild(jvPanel);
      }

      card.appendChild(jvContainer);
    } else if (isActivePermanent) {
      const successText = document.createElement('div');
      successText.style.fontSize = '0.78rem';
      successText.style.color = 'var(--accent-gold)';
      successText.style.textAlign = 'center';
      successText.style.fontWeight = '600';
      successText.style.padding = '4px 0';
      successText.textContent = '✓ Upgrade Built Permanently';
      card.appendChild(successText);
    } else {
      const successText = document.createElement('div');
      successText.style.fontSize = '0.78rem';
      successText.style.color = 'var(--accent-green)';
      successText.style.textAlign = 'center';
      successText.style.fontWeight = '600';
      successText.style.padding = '4px 0';
      successText.textContent = `✓ Event Active: ${p.activeDaysLeft} Days Left`;
      card.appendChild(successText);
    }

    projectsListContainer.appendChild(card);
  });
}

function openBankOverlay() {
  const player = players[currentPlayerIndex];
  const bankProp = findBestBank(player);
  
  updateBankOverlayUI(player, bankProp);

  bankOverlay.style.display = 'flex';
  setTimeout(() => bankOverlay.classList.add('active'), 50);
}

function updateBankOverlayUI(player, bankProp) {
  if (player.pendingSaleCash > 0) {
    bankUserCash.innerHTML = `$${player.cash.toLocaleString()} <span style="font-size: 0.72rem; color: var(--accent-cyan); font-weight: 500;">(+$${player.pendingSaleCash.toLocaleString()} pending)</span>`;
  } else {
    bankUserCash.textContent = `$${player.cash.toLocaleString()}`;
  }
  bankUserDebt.textContent = `$${player.debt.toLocaleString()}`;
  
  const baseRate = bankProp ? bankProp.interestRate : 0.18;
  const discount = Math.min(0.5, (player.skills.social - 1) * 0.05);
  const userRate = baseRate * (1 - discount);
  
  bankBaseInterest.textContent = `${(baseRate * 100).toFixed(1)}%`;
  bankDailyRate.textContent = `${((userRate / 30) * 100).toFixed(3)}%`;

  const dailyChargeAmt = Math.round(player.debt * (userRate / 30));
  bankDailyCharge.textContent = `-$${dailyChargeAmt.toLocaleString()}`;

  // Update endgame penalty warning dynamically
  if (bankPenaltyWarning && projectedDebtPenalty) {
    if (player.debt > 0) {
      bankPenaltyWarning.style.display = 'flex';
      const penaltyAmt = Math.round(player.debt * 0.20);
      projectedDebtPenalty.textContent = `-$${penaltyAmt.toLocaleString()}`;
    } else {
      bankPenaltyWarning.style.display = 'none';
    }
  }

  // Borrow button state
  // Can borrow if debt doesn't exceed 50k limit
  btnBankBorrow.disabled = player.regularDebt >= 50000;

  // Repay state
  const repayAmount = Math.min(10000, player.debt);
  btnBankRepay.textContent = `Repay Loan ($${repayAmount.toLocaleString()})`;
  btnBankRepay.disabled = player.debt <= 0 || player.cash < repayAmount;
}

function closeBankOverlay() {
  bankOverlay.classList.remove('active');
  setTimeout(() => bankOverlay.style.display = 'none', 300);
}

function showNotification(message, title = "Notice", type = "warning") {
  notificationTitle.textContent = title;
  notificationMessage.textContent = message;
  
  if (notificationConfirmButtons) {
    notificationConfirmButtons.style.display = 'none';
  }
  btnNotificationClose.style.display = 'block';
  
  if (type === 'error') {
    notificationTitle.style.color = 'var(--accent-pink)';
  } else if (type === 'success') {
    notificationTitle.style.color = 'var(--accent-green)';
  } else {
    notificationTitle.style.color = 'var(--accent-cyan)';
  }

  notificationOverlay.style.display = 'flex';
  setTimeout(() => {
    notificationOverlay.classList.add('active');
  }, 50);
}

function showConfirm(message, title = "Confirm") {
  return new Promise((resolve) => {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    notificationTitle.style.color = 'var(--accent-cyan)';
    
    btnNotificationClose.style.display = 'none';
    if (notificationConfirmButtons) {
      notificationConfirmButtons.style.display = 'grid';
    }
    
    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const cleanup = () => {
      btnNotificationConfirm.removeEventListener('click', onConfirm);
      btnNotificationCancel.removeEventListener('click', onCancel);
      closeNotification();
    };
    
    btnNotificationConfirm.addEventListener('click', onConfirm);
    btnNotificationCancel.addEventListener('click', onCancel);
    
    notificationOverlay.style.display = 'flex';
    setTimeout(() => {
      notificationOverlay.classList.add('active');
    }, 50);
  });
}

function closeNotification() {
  notificationOverlay.classList.remove('active');
  setTimeout(() => {
    notificationOverlay.style.display = 'none';
  }, 300);
}

function showEndgameScreen() {
  // Sort players by final Net Worth (descending, with endgame penalty applied)
  const ranked = [...players].sort((a, b) => {
    return b.getNetWorth(properties, true) - a.getNetWorth(properties, true);
  });

  endgameLeaderboard.innerHTML = '';
  ranked.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = `leaderboard-row ${idx === 0 ? 'winner' : ''}`;
    row.style.flexDirection = 'column';
    row.style.alignItems = 'stretch';
    row.style.gap = '8px';
    
    const rankText = idx === 0 ? '🏆 1' : `${idx + 1}`;
    const nw = p.getNetWorth(properties, true);
    
    // Calculate values for breakdown
    const owned = properties.filter(prop => prop.owner === p);
    const assetValue = owned.reduce((sum, prop) => sum + prop.getValue(), 0);
    const penalty = p.debt > 0 ? Math.round(p.debt * 0.20) : 0;

    row.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="rank-badge">${rankText}</div>
          <div class="leaderboard-row-name">
            <div class="player-color-dot" style="background-color: ${p.color}"></div>
            <span>${p.name}</span>
          </div>
        </div>
        <div class="leaderboard-row-networth">$${nw.toLocaleString()}</div>
      </div>
      <div class="leaderboard-breakdown" style="display: flex; flex-wrap: wrap; gap: 15px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 4px; color: var(--text-muted);">
        <div>Cash: <span style="color: var(--accent-green); font-weight: 600;">$${p.cash.toLocaleString()}</span></div>
        <div>Assets: <span style="color: var(--accent-cyan); font-weight: 600;">$${assetValue.toLocaleString()}</span></div>
        <div>Debt: <span style="color: var(--accent-pink); font-weight: 600;">-$${p.debt.toLocaleString()}</span></div>
        <div>Debt Penalty (20%): <span style="color: ${p.debt > 0 ? 'var(--accent-pink)' : 'var(--text-muted)'}; font-weight: 600;">${p.debt > 0 ? `-$${penalty.toLocaleString()}` : '$0'}</span></div>
      </div>
    `;
    endgameLeaderboard.appendChild(row);
  });

  gameScreen.classList.remove('active');
  endgameScreen.style.display = 'flex';
  setTimeout(() => endgameScreen.classList.add('active'), 50);
}

// --- BOOTSTRAP APP ---
window.addEventListener('DOMContentLoaded', () => {
  initSetupScreen();
});
