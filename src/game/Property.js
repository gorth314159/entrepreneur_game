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
  purchase(player) {
    const price = this.getPurchasePrice(player);
    if (player.cash >= price && this.owner === null) {
      player.cash -= price;
      this.owner = player;
      player.logTransaction('Property Purchase', -price, `Purchased ${this.name}`);
      return true;
    }
    return false;
  }

  /**
   * Calculates the purchase price including player Planning discount.
   */
  getPurchasePrice(player) {
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
  decayAdAwareness() {
    this.adAwareness = Math.max(0.1, this.adAwareness * 0.8); // 20% decay daily, minimum 0.1
  }

  /**
   * Abstract day simulation logic.
   */
  simulateDay(town) {
    // Overridden by sub-classes
    this.decayAdAwareness();
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
  sellGoods(purchaser, quantity) {
    const qty = Math.min(quantity, this.inventory);
    if (qty <= 0) return 0;

    const cost = qty * this.wholesalePrice;
    if (purchaser.cash < cost) return 0;

    purchaser.cash -= cost;
    purchaser.logTransaction('Wholesale Purchase', -cost, `Bought ${qty} raw goods from ${this.name}`);
    
    this.inventory -= qty;

    if (this.owner) {
      this.owner.cash += cost;
      this.owner.logTransaction('Wholesale Revenue', cost, `Sold ${qty} raw goods to ${purchaser.name}`);
    }

    return qty;
  }

  /**
   * Sells 1 unit of raw goods to a town-owned business.
   */
  sellUnitToTown(town) {
    const reserve = this.owner ? 20 : 0;
    if (this.inventory <= reserve) return false;
    this.inventory--;
    
    if (this.owner) {
      this.owner.cash += this.wholesalePrice;
      this.owner.logTransaction('Wholesale Revenue', this.wholesalePrice, `Sold 1 raw good to Town Business`);
      if (town) {
        town.recordPlayerRevenue(this.owner.id, this.wholesalePrice, 0);
      }
    }
    return true;
  }

  simulateDay(town) {
    super.simulateDay(town);
    
    // Produce raw goods
    // Management skill of the owner reduces production cost per unit
    const costReduction = this.owner ? this.owner.getManagementModifier() : 0;
    const currentCost = Math.round(this.productionCostPerUnit * (1 - costReduction));

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
        this.owner.cash += profit;
        this.owner.logTransaction('Farm Clearance Sale', profit, `Cleared ${excess} excess inventory wholesale`);
        town.recordPlayerRevenue(this.owner.id, profit, 0);
      }
    } else {
      // Unowned farms produce automatically and keep inventory static for purchases
      this.inventory = Math.min(100, this.inventory + dailyProduction);
    }
  }
}

/**
 * B2C Property: Serves town customers directly.
 */
export class B2CProperty extends Property {
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
        this.emergencyImportCost = 18;
        break;
      case 'Restaurant':
        this.price = 45;
        this.capacity = 25;
        this.requiresGoods = true;
        this.emergencyImportCost = 28;
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
    
    const qtyBought = farm.sellGoods(this.owner, quantity);
    this.rawGoodsInventory += qtyBought;
    return qtyBought;
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
    
    // Consume raw goods if required
    if (this.requiresGoods) {
      if (this.rawGoodsInventory > 0) {
        this.rawGoodsInventory--;
      } else {
        // Auto-purchase emergency imports if owner has cash
        if (this.owner && this.owner.cash >= this.emergencyImportCost) {
          this.owner.cash -= this.emergencyImportCost;
          this.owner.logTransaction('Emergency Import', -this.emergencyImportCost, `Imported raw goods for customer at ${this.name}`);
          isEmergencyStocked = true;
        } else if (!this.owner) {
          // Try to source from a Farm in town first
          const farm = town ? town.findBestFarmForTownPurchase() : null;
          if (farm) {
            farm.sellUnitToTown(town);
          }
          isEmergencyStocked = true;
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

    if (this.owner) {
      this.owner.cash += revenue;
      // Adjust customer satisfaction based on social skills of owner
      const socialBonus = this.owner.getSocialSatisfactionModifier();
      this.customerSatisfaction = Math.min(1.0, Math.max(0.3, 0.75 + socialBonus + satisfactModifier));
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

    // Reset daily counters for tomorrow
    this.customersServedToday = 0;
    this.revenueToday = 0;
    super.simulateDay(town);
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
}
