import Player from './game/Player.js';
import { Property, Bank, AdServices, Farm, B2CProperty, Apartments } from './game/Property.js';
import Town from './game/Town.js';
import Map from './game/Map.js';

// --- GAME STATE ---
let players = [];
let properties = [];
let town = null;
let map = null;

let currentPlayerIndex = 0;
let selectedProperty = null;
let maxDays = 30;
let activeTab = 'tab-properties';

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
const btnBankClose = document.getElementById('btn-bank-close');
const btnHelpClose = document.getElementById('btn-help-close');

// Bank Modal Elements
const bankUserCash = document.getElementById('bank-user-cash');
const bankUserDebt = document.getElementById('bank-user-debt');
const bankInterestRate = document.getElementById('bank-interest-rate');
const btnBankBorrow = document.getElementById('btn-bank-borrow');
const btnBankRepay = document.getElementById('btn-bank-repay');

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

// --- SETUP PHASE ---

function initSetupScreen() {
  renderPlayerSetupRows();

  playerCountSelect.addEventListener('change', renderPlayerSetupRows);

  btnStartGame.addEventListener('click', () => {
    startGame();
  });
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

// --- INITIALIZE GAME STATE ---

function startGame() {
  const count = parseInt(playerCountSelect.value, 10);
  maxDays = parseInt(gameLengthSelect.value, 10);
  
  players = [];
  for (let i = 0; i < count; i++) {
    const name = document.getElementById(`player-name-${i}`).value || `Player ${i + 1}`;
    const colorCircle = playerSetupContainer.children[i].querySelector('.color-circle');
    const color = colorCircle.dataset.color;
    players.push(new Player(`p_${i}`, name, color, 50000));
  }

  // Setup properties
  properties = [
    new Farm('prop_farm_1', 'Valley Organic Farm', 0, 0, 4, 3),
    new Apartments('prop_apt_1', 'Horizon High-Rise', 5, 0, 4, 3),
    new Apartments('prop_apt_2', 'Sunset Gardens', 16, 12, 4, 3),
    new B2CProperty('prop_gro_1', 'Metro Grocers', 'GroceryStore', 1, 4, 3, 3),
    new Bank('prop_bank', 'Union Reserve Bank', 5, 4, 3, 3),
    new AdServices('prop_ads', 'Apex Marketing Group', 11, 4, 3, 3),
    new B2CProperty('prop_gro_2', 'Corner Market', 'GroceryStore', 11, 8, 3, 3),
    new B2CProperty('prop_rest_1', 'Neon Diner', 'Restaurant', 5, 8, 3, 3),
    new B2CProperty('prop_rest_2', 'Apex Fusion Grill', 'Restaurant', 11, 12, 3, 3),
    new B2CProperty('prop_ret', 'Aura Boutique', 'RetailStore', 1, 8, 3, 3),
    new B2CProperty('prop_mech', 'Vortex Garage', 'MechanicShop', 5, 12, 3, 3),
  ];

  town = new Town();
  town.maxDays = maxDays;
  currentPlayerIndex = 0;
  selectedProperty = null;

  // Initialize Map
  map = new Map(canvas, properties, (prop) => {
    selectedProperty = prop;
    updateUI();
  });

  // Setup UI tabs listeners
  setupTabListeners();
  setupHUDActionListeners();

  // Hide Setup Screen and show Game Screen
  setupScreen.style.display = 'none';
  gameScreen.classList.add('active');

  // Trigger main animation draw loop
  animateMap();

  startTurn(0);
}

// Map Animation Render Loop
function animateMap() {
  map.draw();
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
  statCash.textContent = `$${player.cash.toLocaleString()}`;
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
    addStatRow('Capacity limit:', `${selectedProperty.customersServedToday} / ${selectedProperty.getCapacity()}`);
    addStatRow('Ad Awareness:', `${(selectedProperty.adAwareness * 100).toFixed(0)}%`);
    addStatRow('Satisfaction:', `${(selectedProperty.customerSatisfaction * 100).toFixed(0)}%`);
    if (selectedProperty.requiresGoods) {
      addStatRow('Raw Stock:', `${selectedProperty.rawGoodsInventory} units`);
    }
  } else if (selectedProperty instanceof Farm) {
    addStatRow('Wholesale Production:', `${40 + (selectedProperty.upgradeLevel - 1) * 20} units/day`);
    addStatRow('Available Stock:', `${selectedProperty.inventory} units`);
  } else if (selectedProperty instanceof Apartments) {
    addStatRow('Max Capacity:', `${selectedProperty.tenants} / ${selectedProperty.getMaxTenants()} tenants`);
  } else if (selectedProperty instanceof Bank) {
    addStatRow('Loans Issued:', `${selectedProperty.totalLoansIssued}`);
  }

  // 2. Custom actions forms (sliders, price selectors)
  inspCustomActions.innerHTML = '';
  
  if (selectedProperty.owner === player) {
    // Owner pricing adjustments
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
    });

    inspCustomActions.appendChild(formRow);

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
      `;

      const sourceSelect = restockRow.querySelector('#restock-source-select');
      const buy20Btn = restockRow.querySelector('#btn-restock-20');
      const buy50Btn = restockRow.querySelector('#btn-restock-50');

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
            alert("Insufficient cash for emergency imports!");
          }
        } else {
          // Buy from farm
          const farm = properties.find(p => p.id === sourceVal);
          if (farm) {
            const avail = Math.min(qty, farm.inventory);
            if (avail <= 0) {
              alert("The farm does not have any goods in stock!");
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
              alert("Insufficient cash for wholesale purchase!");
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
      if (selectedProperty.purchase(player)) {
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

    // If B2C, add marketing campaign packages
    if (selectedProperty instanceof B2CProperty) {
      // Find AdServices player or use default town agency
      const adAgency = properties.find(p => p instanceof AdServices);
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
    descText.textContent = `Property is currently operated by ${selectedProperty.owner.name}.`;
    inspButtonsContainer.appendChild(descText);
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

  // Bank Borrow and Repay logic
  btnBankBorrow.addEventListener('click', () => {
    const player = players[currentPlayerIndex];
    const bankProp = properties.find(p => p instanceof Bank);
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
    const bankProp = properties.find(p => p instanceof Bank);

    player.repayDebt(10000);
    updateUI();
    updateBankOverlayUI(player, bankProp);
  });
}

function openBankOverlay() {
  const player = players[currentPlayerIndex];
  const bankProp = properties.find(p => p instanceof Bank);
  
  updateBankOverlayUI(player, bankProp);

  bankOverlay.style.display = 'flex';
  setTimeout(() => bankOverlay.classList.add('active'), 50);
}

function updateBankOverlayUI(player, bankProp) {
  bankUserCash.textContent = `$${player.cash.toLocaleString()}`;
  bankUserDebt.textContent = `$${player.debt.toLocaleString()}`;
  
  const baseRate = bankProp ? bankProp.interestRate : 0.18;
  const discount = Math.min(0.5, (player.skills.social - 1) * 0.05);
  const userRate = baseRate * (1 - discount);
  
  bankInterestRate.textContent = `${(userRate * 100).toFixed(1)}% (Base: ${(baseRate * 100).toFixed(0)}%)`;

  // Borrow button state
  // Can borrow if debt doesn't exceed 50k limit
  btnBankBorrow.disabled = player.debt >= 50000;

  // Repay state
  const repayAmount = Math.min(10000, player.debt);
  btnBankRepay.textContent = `Repay Loan ($${repayAmount.toLocaleString()})`;
  btnBankRepay.disabled = player.debt <= 0 || player.cash < repayAmount;
}

function closeBankOverlay() {
  bankOverlay.classList.remove('active');
  setTimeout(() => bankOverlay.style.display = 'none', 300);
}

// --- ENDGAME OVERLAYS & RANKING ---

function showEndgameScreen() {
  // Sort players by final Net Worth (descending)
  const ranked = [...players].sort((a, b) => {
    return b.getNetWorth(properties) - a.getNetWorth(properties);
  });

  endgameLeaderboard.innerHTML = '';
  ranked.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = `leaderboard-row ${idx === 0 ? 'winner' : ''}`;
    
    const rankText = idx === 0 ? '🏆 1' : `${idx + 1}`;
    const nw = p.getNetWorth(properties);
    
    row.innerHTML = `
      <div class="rank-badge">${rankText}</div>
      <div class="leaderboard-row-name">
        <div class="player-color-dot" style="background-color: ${p.color}"></div>
        <span>${p.name}</span>
      </div>
      <div class="leaderboard-row-networth">$${nw.toLocaleString()}</div>
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
