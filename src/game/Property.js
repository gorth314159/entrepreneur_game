/**
 * Base Property class representing any real estate on the town map.
 */
export class Property {
  constructor(id, name, type, gridX, gridY, width, height, basePrice, baseMaintenance) {
    this.id = id;
    this.name = name;
    this.type = type; // 'Bank', 'AdServices', 'Farm', 'GroceryStore', 'Restaurant', 'RetailStore', 'MechanicShop', 'Apartments'
    this.gridX = gridX;
    this.gridY = gridY;
    this.width = width;
    this.height = height;
    
    this.basePrice = basePrice;
    this.baseMaintenance = baseMaintenance;
    
    this.owner = null; // Player object or null (town-owned)
    this.upgradeLevel = 1; // 1 to 5
    
    // B2C & General factors
    this.customerSatisfaction = 0.75; // 0.0 to 1.0
    this.adAwareness = 0.1; // 0.0 to 1.0 (multiplier for foot traffic)

    this.soldToBankBy = []; // List of player IDs who sold this property to the bank
    this.purchaseDay = null; // Day of purchase
  }

  /**
   * Returns current value of the property including upgrades.
   */
  getValue() {
    // Value = Base Price + sum of upgrade costs
    let totalVal = this.basePrice;
    for (let i = 2; i <= this.upgradeLevel; i++) {
      totalVal += this.getUpgradeCost(i);
    }
    return totalVal;
  }

  /**
   * Cost of upgrading to next level.
   */
  getUpgradeCost(level = this.upgradeLevel + 1) {
    if (level > 5) return Infinity;
    // Upgrade cost scales up based on base price
    return Math.round(this.basePrice * 0.4 * (level - 1));
  }

  /**
   * Checks if player can afford property and purchases it.
   */
  purchase(player, currentDay = null) {
    const price = this.getPurchasePrice(player);
    if (player.cash >= price && this.owner === null) {
      player.cash -= price;
      this.owner = player;
      this.purchaseDay = currentDay;
      player.logTransaction('Property Purchase', -price, `Purchased ${this.name}`);
      
      // Remove from soldToBankBy if present
      if (this.soldToBankBy && player) {
        const idx = this.soldToBankBy.indexOf(player.id);
        if (idx !== -1) {
          this.soldToBankBy.splice(idx, 1);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Calculates the purchase price including player Planning discount.
   */
  getPurchasePrice(player) {
    // If the player previously sold this property to the bank, they must buy it back at full price.
    if (player && this.soldToBankBy && this.soldToBankBy.includes(player.id)) {
      return this.basePrice;
    }
    const discount = player ? player.getPlanningModifier() : 0;
    return Math.round(this.basePrice * (1 - discount));
  }

  /**
   * Upgrades the property.
   */
  upgrade(player) {
    if (this.owner !== player) return false;
    if (this.upgradeLevel >= 5) return false;

    const rawCost = this.getUpgradeCost();
    const discount = player.getTechnologyModifier();
    const adjustedCost = Math.round(rawCost * (1 - discount));

    if (player.cash >= adjustedCost) {
      player.cash -= adjustedCost;
      this.upgradeLevel++;
      player.logTransaction('Property Upgrade', -adjustedCost, `Upgraded ${this.name} to Level ${this.upgradeLevel}`);
      return true;
    }
    return false;
  }

  /**
   * Daily maintenance cost of the property.
   */
  getMaintenanceCost() {
    // Planning skill reduces maintenance cost
    const discount = this.owner ? this.owner.getPlanningModifier() : 0;
    // Level increases maintenance cost by 30% per level
    const levelMultiplier = 1 + (this.upgradeLevel - 1) * 0.3;
    return Math.round(this.baseMaintenance * levelMultiplier * (1 - discount));
  }

  /**
   * Decay ad awareness daily.
   */
  decayAdAwareness(town) {
    const minAd = (town && town.developmentManager && town.developmentManager.isProjectActive('business_expo')) ? 0.25 : 0.1;
    this.adAwareness = Math.max(minAd, this.adAwareness * 0.8); // 20% decay daily
  }

  /**
   * Resets the property to town ownership and default state.
   */
  reset() {
    this.owner = null;
    this.upgradeLevel = 1;
    this.customerSatisfaction = 0.75;
    this.adAwareness = 0.1;
    this.purchaseDay = null; // Reset purchase day
  }

  /**
   * Abstract day simulation logic.
   */
  simulateDay(town) {
    // Overridden by sub-classes
    this.decayAdAwareness(town);
  }
}

/**
 * Bank Property: issues loans and collects interest.
 */
export class Bank extends Property {
  constructor(id, name, gridX, gridY, width, height) {
    super(id, name, 'Bank', gridX, gridY, width, height, 100000, 150);
    this.interestRate = 0.15; // Annualized rate set by owner (e.g. 15%)
    this.totalLoansIssued = 0;
    this.totalInterestCollected = 0;
  }

  /**
   * Set interest rate. Bound between 5% and 50%.
   */
  setInterestRate(rate) {
    this.interestRate = Math.max(0.05, Math.min(0.50, rate));
  }

  reset() {
    super.reset();
    this.interestRate = 0.15;
    this.totalLoansIssued = 0;
    this.totalInterestCollected = 0;
  }

  simulateDay(town) {
    super.simulateDay(town);
    // As a business, Bank generates passive town transaction & processing fees
    if (this.owner) {
      const passiveIncome = Math.round(town.population * 8 * this.upgradeLevel);
      this.owner.cash += passiveIncome;
      this.owner.logTransaction('Bank Fee Income', passiveIncome, `Daily town banking & processing fees`);
      town.recordPlayerRevenue(this.owner.id, passiveIncome, 0);
    }
  }
}

/**
 * Ad Services Property: provides marketing to other businesses.
 */
export class AdServices extends Property {
  constructor(id, name, gridX, gridY, width, height) {
    super(id, name, 'AdServices', gridX, gridY, width, height, 40000, 80);
    this.campaignPrice = 1500; // Price for an ad campaign
  }

  /**
   * Set campaign package price. Bound between 500 and 5000.
   */
  setCampaignPrice(price) {
    this.campaignPrice = Math.max(500, Math.min(5000, price));
  }

  /**
   * Sell an ad campaign to a target property.
   * @param {Property} targetProperty
   * @param {Player} purchasingPlayer
   */
  sellCampaign(targetProperty, purchasingPlayer) {
    if (purchasingPlayer.cash < this.campaignPrice) return false;

    purchasingPlayer.cash -= this.campaignPrice;
    purchasingPlayer.logTransaction('Ad Campaign Purchase', -this.campaignPrice, `Purchased campaign for ${targetProperty.name}`);

    // Direct revenue to owner
    if (this.owner) {
      const ownerRevenue = Math.round(this.campaignPrice * 0.9); // 10% operational overhead
      this.owner.cash += ownerRevenue;
      this.owner.logTransaction('Ad Campaign Sold', ownerRevenue, `Sold marketing campaign to ${purchasingPlayer.name}`);
    }

    // Boost target property awareness
    // Multiplied by buyer's marketing skill
    const marketingBonus = purchasingPlayer.getMarketingModifier();
    const effectiveness = 0.50 * marketingBonus * (1 + (this.upgradeLevel - 1) * 0.15); // Upgrades boost base effect
    targetProperty.adAwareness = Math.min(1.0, targetProperty.adAwareness + effectiveness);

    return true;
  }

  reset() {
    super.reset();
    this.campaignPrice = 1500;
  }

  simulateDay(town) {
    super.simulateDay(town);
    if (!this.owner) return;

    const baseline = Math.round(town.population * 1.5 * this.upgradeLevel);

    const b2cTypes = ['GroceryStore', 'Restaurant', 'RetailStore', 'MechanicShop'];
    const adActiveBusinesses = (town.currentProperties || [])
      .filter(p => b2cTypes.includes(p.type) && p.adAwareness > 0.15);
    const retainer = adActiveBusinesses.length * 80 * this.upgradeLevel;

    const total = baseline + retainer;
    if (total > 0) {
      this.owner.cash += total;
      this.owner.logTransaction(
        'Ad Agency Income',
        total,
        `Baseline contracts ($${baseline}) + ${adActiveBusinesses.length} active retainer(s) ($${retainer})`
      );
      town.recordPlayerRevenue(this.owner.id, total, 0);
    }
  }
}

/**
 * Farm Property: Produces wholesale raw goods.
 */
export class Farm extends Property {
  constructor(id, name, gridX, gridY, width, height) {
    super(id, name, 'Farm', gridX, gridY, width, height, 30000, 60);
    this.wholesalePrice = 15; // wholesale price per unit of raw goods
    this.inventory = 40; // Start with 40 units of stock available
    this.productionCostPerUnit = 8;
    this.unitsSoldToday = 0;
    this.unitsSoldLastSimulation = 0;
  }

  /**
   * Sets wholesale price. Bound between 8 and 40.
   */
  setWholesalePrice(price) {
    this.wholesalePrice = Math.max(8, Math.min(40, price));
  }

  /**
   * Sells goods to B2C businesses.
   */
  sellGoods(purchaser, quantity, destinationProperty = null) {
    const qty = Math.min(quantity, this.inventory);
    if (qty <= 0) return 0;

    const cost = qty * this.wholesalePrice;
    const isInternalTransfer = this.owner !== null && this.owner === purchaser;

    if (!isInternalTransfer && purchaser.cash < cost) return 0;

    this.inventory -= qty;
    this.unitsSoldToday += qty;

    if (isInternalTransfer) {
      const destName = destinationProperty ? destinationProperty.name : 'your store';
      purchaser.logTransaction('Internal Transfer', 0, `Transferred ${qty} raw goods from ${this.name} to ${destName}`);
    } else {
      purchaser.cash -= cost;
      purchaser.logTransaction('Wholesale Purchase', -cost, `Bought ${qty} raw goods from ${this.name}`);
      
      if (this.owner) {
        this.owner.cash += cost;
        this.owner.logTransaction('Wholesale Revenue', cost, `Sold ${qty} raw goods to ${purchaser.name}`);
      }
    }

    return qty;
  }

  /**
   * Calculates current production cost per unit.
   */
  getProductionCostPerUnit() {
    const costReduction = this.owner ? this.owner.getManagementModifier() : 0;
    return Math.round(this.productionCostPerUnit * (1 - costReduction));
  }

  /**
   * Sells 1 unit of raw goods to a town-owned business.
   */
  sellUnitToTown(town) {
    const reserve = this.owner ? 20 : 0;
    if (this.inventory <= reserve) return false;
    this.inventory--;
    this.unitsSoldToday++;
    
    if (this.owner) {
      this.owner.cash += this.wholesalePrice;
      this.owner.logTransaction('Wholesale Revenue', this.wholesalePrice, `Sold 1 raw good to Town Business`);
      if (town) {
        town.recordPlayerRevenue(this.owner.id, this.wholesalePrice, 0);
        town.recordPlayerCogs(this.owner.id, this.getProductionCostPerUnit());
      }
    }
    return true;
  }

  simulateDay(town) {
    super.simulateDay(town);
    
    // Produce raw goods
    // Management skill of the owner reduces production cost per unit
    const costReduction = this.owner ? this.owner.getManagementModifier() : 0;
    const currentCost = this.getProductionCostPerUnit(); // Math.round(this.productionCostPerUnit * (1 - costReduction));

    const dailyProduction = 40 + (this.upgradeLevel - 1) * 20;
    const productionCostTotal = dailyProduction * currentCost;

    if (this.owner) {
      // Owner must cover production costs
      if (this.owner.cash >= productionCostTotal) {
        this.owner.cash -= productionCostTotal;
        this.inventory += dailyProduction;
        this.owner.logTransaction('Farm Production Cost', -productionCostTotal, `Produced ${dailyProduction} goods`);
      } else {
        // Underfunded, produce partial inventory
        const affordableQty = Math.floor(this.owner.cash / currentCost);
        if (affordableQty > 0) {
          const cost = affordableQty * currentCost;
          this.owner.cash -= cost;
          this.inventory += affordableQty;
          this.owner.logTransaction('Farm Production Cost', -cost, `Produced partial quantity of ${affordableQty} goods`);
        }
      }

      // Auto-sell excess stock if inventory exceeds 100 units
      if (this.inventory > 120) {
        const excess = this.inventory - 120;
        const autoSellPrice = 10; // low emergency clearance price
        const profit = excess * autoSellPrice;
        this.inventory = 120;
        this.unitsSoldToday += excess;
        this.owner.cash += profit;
        this.owner.logTransaction('Farm Clearance Sale', profit, `Cleared ${excess} excess inventory wholesale`);
        town.recordPlayerRevenue(this.owner.id, profit, 0);
        town.recordPlayerCogs(this.owner.id, excess * currentCost);
      }
    } else {
      // Unowned farms produce automatically and keep inventory static for purchases
      this.inventory = Math.min(100, this.inventory + dailyProduction);
    }

    // Save last day's metrics before resetting
    this.unitsSoldLastSimulation = this.unitsSoldToday;
    this.unitsSoldToday = 0;
  }

  reset() {
    super.reset();
    this.wholesalePrice = 15;
    this.inventory = 40;
    this.unitsSoldToday = 0;
    this.unitsSoldLastSimulation = 0;
  }
}

/**
 * B2C Property: Serves town customers directly.
 */
export class B2CProperty extends Property {
  static allProperties = [];

  get benchmarkPrice() {
    switch (this.type) {
      case 'GroceryStore': return 25;
      case 'Restaurant': return 45;
      case 'RetailStore': return 35;
      case 'MechanicShop': return 60;
      default: return 30;
    }
  }

  get emergencyImportCost() {
    const list = B2CProperty.allProperties || [];
    const sameTypeProps = list.filter(p => p.type === this.type);
    const farms = list.filter(p => p.type === 'Farm');
    const allPrices = [
      ...sameTypeProps.map(p => p.price || 0),
      ...farms.map(p => p.wholesalePrice || 0)
    ];
    if (allPrices.length === 0) {
      return this.type === 'GroceryStore' ? 18 : 28;
    }
    const maxPrice = Math.max(...allPrices);
    return Math.ceil(maxPrice * 1.05);
  }

  constructor(id, name, type, gridX, gridY, width, height, basePrice, baseMaintenance) {
    let price = basePrice;
    let maint = baseMaintenance;
    
    if (price === undefined || price === null) {
      if (type === 'GroceryStore') price = 20000;
      else if (type === 'Restaurant') price = 30000;
      else if (type === 'RetailStore') price = 25000;
      else if (type === 'MechanicShop') price = 35000;
      else price = 25000;
    }
    
    if (maint === undefined || maint === null) {
      if (type === 'GroceryStore') maint = 50;
      else if (type === 'Restaurant') maint = 75;
      else if (type === 'RetailStore') maint = 60;
      else if (type === 'MechanicShop') maint = 90;
      else maint = 60;
    }

    super(id, name, type, gridX, gridY, width, height, price, maint);
    
    // Set default variables based on business type
    switch (type) {
      case 'GroceryStore':
        this.price = 25; // price charged per unit
        this.capacity = 35; // base customer capacity
        this.requiresGoods = true;
        break;
      case 'Restaurant':
        this.price = 45;
        this.capacity = 25;
        this.requiresGoods = true;
        break;
      case 'RetailStore':
        this.price = 35;
        this.capacity = 40;
        this.requiresGoods = false;
        break;
      case 'MechanicShop':
        this.price = 60;
        this.capacity = 20;
        this.requiresGoods = false;
        break;
    }

    this.rawGoodsInventory = 0;
    this.customersServedToday = 0;
    this.revenueToday = 0;
    this.cogsToday = 0;
    this.averageUnitCost = 15; // default unit cost basis
    this.autoPurchaseEnabled = false;
    this.autoPurchaseAmount = 20;
    this.autoPurchaseSource = 'market';
    this.customersServedLastSimulation = 0;
  }

  /**
   * Helper to add items to raw goods inventory while updating weighted average cost basis.
   */
  addToInventory(qty, unitCost) {
    if (qty <= 0) return;
    const totalCost = (this.rawGoodsInventory * this.averageUnitCost) + (qty * unitCost);
    this.rawGoodsInventory += qty;
    this.averageUnitCost = this.rawGoodsInventory > 0 ? totalCost / this.rawGoodsInventory : unitCost;
  }

  setPrice(newPrice) {
    // Clamp prices to realistic values
    switch (this.type) {
      case 'GroceryStore': this.price = Math.max(5, Math.min(80, newPrice)); break;
      case 'Restaurant': this.price = Math.max(10, Math.min(150, newPrice)); break;
      case 'RetailStore': this.price = Math.max(10, Math.min(100, newPrice)); break;
      case 'MechanicShop': this.price = Math.max(15, Math.min(200, newPrice)); break;
    }
  }

  getCapacity() {
    // Upgrades increase business capacity
    return this.capacity + (this.upgradeLevel - 1) * 15;
  }

  /**
   * Refuels raw goods from a Farm or buys emergency imports.
   */
  restockFromFarm(farm, quantity) {
    if (!this.requiresGoods || !this.owner) return 0;
    
    const qtyBought = farm.sellGoods(this.owner, quantity, this);
    this.addToInventory(qtyBought, farm.wholesalePrice);
    return qtyBought;
  }

  /**
   * Performs auto-purchase of raw goods from a Farm or emergency market.
   */
  performAutoPurchase(properties, town) {
    if (!this.requiresGoods || !this.owner || !this.autoPurchaseEnabled) return;

    const qty = this.autoPurchaseAmount;
    if (qty <= 0) return;

    if (this.autoPurchaseSource === 'market') {
      const totalCost = qty * this.emergencyImportCost;
      if (this.owner.cash >= totalCost) {
        this.owner.cash -= totalCost;
        this.addToInventory(qty, this.emergencyImportCost);
        this.owner.logTransaction(
          'Auto-Purchase (Emergency)',
          -totalCost,
          `Auto-imported ${qty} goods for ${this.name}`
        );
        if (town && town.currentDailyLog) {
          town.currentDailyLog.events.push(
            `${this.owner.name} auto-purchased ${qty} emergency units for ${this.name} (-$${totalCost.toLocaleString()}).`
          );
        }
      } else {
        if (town && town.currentDailyLog) {
          town.currentDailyLog.events.push(
            `Auto-Purchase failed: Insufficient cash to emergency import for ${this.name}.`
          );
        }
      }
    } else {
      const farm = properties.find(p => p.id === this.autoPurchaseSource);
      if (farm) {
        const avail = Math.min(qty, farm.inventory);
        if (avail <= 0) {
          if (town && town.currentDailyLog) {
            town.currentDailyLog.events.push(
              `Auto-Purchase failed: ${farm.name} is out of stock for ${this.name}.`
            );
          }
          return;
        }

        const totalCost = avail * farm.wholesalePrice;
        const isOwnFarm = farm.owner === this.owner;

        if (isOwnFarm || this.owner.cash >= totalCost) {
          const bought = this.restockFromFarm(farm, avail);
          if (bought > 0 && town && town.currentDailyLog) {
            const transferType = isOwnFarm ? 'internal transfer' : 'purchase';
            const costText = isOwnFarm ? 'free transfer' : `-$${totalCost.toLocaleString()}`;
            town.currentDailyLog.events.push(
              `${this.owner.name} auto-purchased ${bought} units from ${farm.name} for ${this.name} (${transferType}, ${costText}).`
            );
          }
        } else {
          if (town && town.currentDailyLog) {
            town.currentDailyLog.events.push(
              `Auto-Purchase failed: Insufficient cash to buy from ${farm.name} for ${this.name} (requires $${totalCost.toLocaleString()}).`
            );
          }
        }
      } else {
        if (town && town.currentDailyLog) {
          town.currentDailyLog.events.push(
            `Auto-Purchase failed: Configured farm not found for ${this.name}.`
          );
        }
      }
    }
  }

  /**
   * Handles customer transaction.
   * Returns transaction revenue.
   */
  serveCustomer(pricePaid, satisfactModifier, town) {
    if (this.customersServedToday >= this.getCapacity()) {
      return 0; // Sold out / capacity reached
    }

    let isEmergencyStocked = false;
    let unitCogs = 0;
    
    // Consume raw goods if required
    if (this.requiresGoods) {
      if (this.rawGoodsInventory > 0) {
        this.rawGoodsInventory--;
        unitCogs = this.averageUnitCost;
      } else {
        // Auto-purchase emergency imports if owner has cash
        if (this.owner && this.owner.cash >= this.emergencyImportCost) {
          this.owner.cash -= this.emergencyImportCost;
          this.owner.logTransaction('Emergency Import', -this.emergencyImportCost, `Imported raw goods for customer at ${this.name}`);
          isEmergencyStocked = true;
          unitCogs = this.emergencyImportCost;
        } else if (!this.owner) {
          // Try to source from a Farm in town first
          const farm = town ? town.findBestFarmForTownPurchase() : null;
          if (farm) {
            farm.sellUnitToTown(town);
          }
          isEmergencyStocked = true;
          unitCogs = farm ? farm.wholesalePrice : this.emergencyImportCost;
        } else {
          // Out of stock, cannot serve customer
          return 0;
        }
      }
    }

    // Complete transaction
    this.customersServedToday++;
    const revenue = pricePaid;
    this.revenueToday += revenue;
    this.cogsToday += unitCogs;

    if (this.owner) {
      this.owner.cash += revenue;
      // Adjust customer satisfaction based on social skills of owner
      const socialBonus = this.owner.getSocialSatisfactionModifier();
      this.customerSatisfaction = Math.min(1.0, Math.max(0.3, 0.75 + socialBonus + satisfactModifier));
      
      if (town) {
        town.recordPlayerCogs(this.owner.id, unitCogs);
      }
    }

    return revenue;
  }

  simulateDay(town) {
    // Maintenance and operations
    if (this.owner) {
      // Base maintenance
      const maintenance = this.getMaintenanceCost();
      // Employee / operation cost scales with capacity
      const managementDiscount = this.owner.getManagementModifier();
      const operationCost = Math.round((this.getCapacity() * 2) * (1 - managementDiscount));
      const totalExpenses = maintenance + operationCost;

      if (this.owner.cash >= totalExpenses) {
        this.owner.cash -= totalExpenses;
        this.owner.logTransaction('Business Expenses', -totalExpenses, `Paid maintenance and operations for ${this.name}`);
      } else {
        // Penalty: underfunded business drops satisfaction
        const partialPay = this.owner.cash;
        this.owner.cash = 0;
        this.owner.logTransaction('Business Expenses (Partial)', -partialPay, `Partially paid maintenance for ${this.name}`);
        this.customerSatisfaction = Math.max(0.2, this.customerSatisfaction - 0.2);
      }
    }

    // Save last day's metrics before resetting
    this.customersServedLastSimulation = this.customersServedToday;

    // Reset daily counters for tomorrow
    this.customersServedToday = 0;
    this.revenueToday = 0;
    this.cogsToday = 0;
    super.simulateDay(town);
  }

  reset() {
    super.reset();
    this.rawGoodsInventory = 0;
    this.customersServedToday = 0;
    this.revenueToday = 0;
    this.cogsToday = 0;
    this.averageUnitCost = 15;
    this.autoPurchaseEnabled = false;
    this.autoPurchaseAmount = 20;
    this.autoPurchaseSource = 'market';
    this.customersServedLastSimulation = 0;
    switch (this.type) {
      case 'GroceryStore': this.price = 25; break;
      case 'Restaurant': this.price = 45; break;
      case 'RetailStore': this.price = 35; break;
      case 'MechanicShop': this.price = 60; break;
    }
  }
}

/**
 * Apartments: passive residential properties generating rent.
 */
export class Apartments extends Property {
  constructor(id, name, gridX, gridY, width, height) {
    super(id, name, 'Apartments', gridX, gridY, width, height, 60000, 120);
    this.rent = 45; // Rent per occupant per day
    this.tenants = 0;
  }

  setRent(newRent) {
    this.rent = Math.max(5, Math.min(100, newRent));
  }

  getMaxTenants() {
    // Max capacity: 10 tenants base, +5 per upgrade level
    return 10 + (this.upgradeLevel - 1) * 5;
  }

  simulateDay(town) {
    // 1. Calculate occupancy rate based on Rent, Town Affluence
    // Customers prefer cheaper rents. High affluence tolerates higher rents.
    let affluenceFactor = 1.0;
    if (town.affluence === 'Low') affluenceFactor = 0.6;
    if (town.affluence === 'High') affluenceFactor = 1.6;

    // Ideal rent index: if rent <= 50 * affluenceFactor, occupancy probability is high
    const targetRent = 50 * affluenceFactor;
    let occupancyProbability = 0.9;

    if (this.rent > targetRent) {
      // Rapid decay in occupancy if rent exceeds target
      occupancyProbability = Math.max(0.1, 0.9 - ((this.rent - targetRent) / targetRent));
    } else {
      // Bonus occupancy if cheaper
      occupancyProbability = Math.min(1.0, 0.9 + ((targetRent - this.rent) / targetRent) * 0.1);
    }

    // Set tenants
    this.tenants = Math.round(this.getMaxTenants() * occupancyProbability);

    // 2. Pay rent to owner
    const totalRentCollected = this.tenants * this.rent;
    if (this.owner && totalRentCollected > 0) {
      this.owner.cash += totalRentCollected;
      this.owner.logTransaction('Rental Income', totalRentCollected, `Collected rent from ${this.tenants} tenants`);
      town.recordPlayerRevenue(this.owner.id, totalRentCollected, this.tenants);
    }

    // 3. Deduct maintenance
    if (this.owner) {
      const maintenance = this.getMaintenanceCost();
      if (this.owner.cash >= maintenance) {
        this.owner.cash -= maintenance;
        this.owner.logTransaction('Apartment Maintenance', -maintenance, `Paid upkeep for ${this.name}`);
      } else {
        this.owner.cash = 0;
        this.owner.logTransaction('Apartment Maintenance (Unpaid)', 0, `Failed to pay maintenance for ${this.name}`);
        this.upgradeLevel = Math.max(1, this.upgradeLevel - 1); // degrades building quality
      }
    }

    super.simulateDay(town);
  }

  reset() {
    super.reset();
    this.rent = 45;
    this.tenants = 0;
  }
}
