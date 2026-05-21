/**
 * Manages the autonomous town population, customer logic, economic health, and simulation phase.
 */
export default class Town {
  constructor() {
    this.population = 150; // Starting population (customers)
    this.affluence = 'Medium'; // 'Low', 'Medium', 'High'
    this.day = 1;
    this.maxDays = 30;
    
    // Average price indices for reference
    this.targetPrices = {
      GroceryStore: 25,
      Restaurant: 45,
      RetailStore: 35,
      MechanicShop: 60
    };

    // Demand weights for different needs (sum to 1)
    this.needWeights = {
      GroceryStore: 0.40, // People need groceries most often
      Restaurant: 0.25,   // Moderate dining out need
      RetailStore: 0.20,   // General shopping
      MechanicShop: 0.15   // Auto repairs (less frequent but expensive)
    };

    this.townLedger = []; // Log of major economic events in the town
  }

  /**
   * Run the end-of-day simulation.
   * @param {Array} properties - List of all properties on the map
   * @param {Array} players - List of all players
   */
  simulateDay(properties, players) {
    this.currentProperties = properties;
    
    // Clear player ledgers at the start of the simulation day
    players.forEach(p => p.clearLedger());

    const dailyLog = {
      day: this.day,
      populationBefore: this.population,
      affluenceBefore: this.affluence,
      totalSales: 0,
      totalCustomersServed: 0,
      economicHealth: 0,
      events: [],
      playerMetrics: {}
    };

    players.forEach(p => {
      dailyLog.playerMetrics[p.id] = {
        name: p.name,
        color: p.color,
        revenue: 0,
        cogs: 0,
        income: 0,
        customersServed: 0
      };
    });

    this.currentDailyLog = dailyLog;

    // 1. Calculate general town economic health based on player activity
    // Economic health is higher if business prices are reasonable, ad campaigns are active, and cash flows.
    let activeBusinesses = properties.filter(p => p.owner !== null && ['GroceryStore', 'Restaurant', 'RetailStore', 'MechanicShop'].includes(p.type));
    let avgPriceRatio = 1.0; // relative to target prices
    
    if (activeBusinesses.length > 0) {
      let ratioSum = 0;
      activeBusinesses.forEach(b => {
        const target = this.targetPrices[b.type] || 30;
        ratioSum += b.price / target;
      });
      avgPriceRatio = ratioSum / activeBusinesses.length;
    }

    // High prices harm economic health. Ads and upgrades boost it.
    let adBoost = properties.reduce((sum, p) => sum + (p.adAwareness || 0), 0) / properties.length;
    let econHealth = 1.0 - (avgPriceRatio - 1.0) * 0.4 + adBoost * 0.3;
    econHealth = Math.max(0.5, Math.min(1.8, econHealth));

    // 2. Adjust Town Population (Migration)
    // Population grows if economy is healthy, shrinks if poor
    const populationChange = Math.round(this.population * (econHealth - 1.0) * 0.08);
    this.population = Math.max(50, Math.min(500, this.population + populationChange));
    
    if (populationChange > 0) {
      dailyLog.events.push(`${populationChange} new residents moved to town due to favorable economic conditions.`);
    } else if (populationChange < 0) {
      dailyLog.events.push(`${Math.abs(populationChange)} residents left town due to high cost of living.`);
    }

    // 3. Shift Affluence
    // Affluence is based on average price index and population level
    const currentScore = econHealth * (this.population / 150);
    const prevAffluence = this.affluence;
    if (currentScore > 1.4) {
      this.affluence = 'High';
    } else if (currentScore < 0.75) {
      this.affluence = 'Low';
    } else {
      this.affluence = 'Medium';
    }

    if (prevAffluence !== this.affluence) {
      dailyLog.events.push(`Town affluence shifted from ${prevAffluence} to ${this.affluence}!`);
    }

    // 4. Simulate Customer Purchases (The Core Probability Loop)
    // Every resident makes a certain number of transaction attempts today based on affluence
    const transactionsPerResident = this.affluence === 'High' ? 2 : this.affluence === 'Medium' ? 1.5 : 1.0;
    const totalVisits = Math.floor(this.population * transactionsPerResident);

    // Group B2C properties by type for comparison
    const b2cTypes = ['GroceryStore', 'Restaurant', 'RetailStore', 'MechanicShop'];
    const propertiesByType = {};
    b2cTypes.forEach(type => {
      propertiesByType[type] = properties.filter(p => p.type === type);
    });

    const bankOwner = (() => {
      const b = properties.find(p => p.type === 'Bank');
      return b && b.owner ? b.owner : null;
    })();

    for (let visit = 0; visit < totalVisits; visit++) {
      // Determine what type of need the customer has
      const rand = Math.random();
      let selectedType = 'GroceryStore';
      let cumulative = 0;
      
      for (const [type, weight] of Object.entries(this.needWeights)) {
        cumulative += weight;
        if (rand <= cumulative) {
          selectedType = type;
          break;
        }
      }

      const options = propertiesByType[selectedType] || [];
      if (options.length === 0) continue;

      // Calculate score for each option
      const optionScores = options.map(prop => {
        return {
          property: prop,
          score: this.calculateBusinessScore(prop)
        };
      });

      const totalScoreSum = optionScores.reduce((sum, opt) => sum + opt.score, 0);
      if (totalScoreSum <= 0) continue;

      // Select a business probabilistically
      const selectRand = Math.random() * totalScoreSum;
      let scoreCum = 0;
      let selectedProp = null;

      for (const opt of optionScores) {
        scoreCum += opt.score;
        if (selectRand <= scoreCum) {
          selectedProp = opt.property;
          break;
        }
      }

      if (selectedProp) {
        // Customer visits the selected business!
        // Price paid can be slightly influenced by satisfaction/upgrades
        let finalPrice = selectedProp.price;
        
        // Customers might tip/pay extra if affluence is high and business rating is top-tier
        if (this.affluence === 'High' && selectedProp.upgradeLevel >= 4) {
          finalPrice = Math.round(finalPrice * 1.15);
        }

        // Attempt transaction
        // SatisfactModifier based on customer need and business upgrade
        const satisfactMod = (selectedProp.upgradeLevel - 1) * 0.05;
        const revenueEarned = selectedProp.serveCustomer(finalPrice, satisfactMod, this);
        
        if (revenueEarned > 0) {
          dailyLog.totalSales += revenueEarned;
          dailyLog.totalCustomersServed++;
          if (selectedProp.owner) {
            this.recordPlayerRevenue(selectedProp.owner.id, revenueEarned, 1);
          }

          if (bankOwner && bankOwner !== selectedProp.owner) {
            const fee = Math.round(revenueEarned * 0.04);
            if (fee > 0) {
              bankOwner.cash += fee;
              bankOwner.logTransaction('Bank Transaction Fee', fee, `Processing fee from ${selectedProp.name}`);
              this.recordPlayerRevenue(bankOwner.id, fee, 0);
            }
          }
        }
      }
    }

    // 5. Run daily update on all properties (this processes maintenance, loan interest, resets daily counters)
    properties.forEach(prop => {
      prop.simulateDay(this);
    });

    // 6. Accrue interest on player loans from the Bank
    // Let's see if there is an active Bank owned by a player
    const playerBank = properties.find(p => p.type === 'Bank' && p.owner !== null);
    
    players.forEach(player => {
      if (player.debt > 0) {
        // Accrue daily interest. (bank interest rate / 30 represents daily interest)
        const bankInterestRate = playerBank ? playerBank.interestRate : 0.18; // 18% default unowned rate
        const dailyInterestRate = bankInterestRate / 30;
        
        const interestPaid = player.accrueInterest(dailyInterestRate);
        
        // If a player owns the bank, the interest goes to their pocket!
        if (interestPaid > 0 && playerBank && playerBank.owner && playerBank.owner !== player) {
          playerBank.owner.cash += interestPaid;
          playerBank.owner.logTransaction('Bank Loan Revenue', interestPaid, `Received loan interest from ${player.name}`);
          this.recordPlayerRevenue(playerBank.owner.id, interestPaid, 0);
        }
      }
    });

    // Update log metrics
    dailyLog.populationAfter = this.population;
    dailyLog.affluenceAfter = this.affluence;
    dailyLog.economicHealth = econHealth;

    // Calculate net income for each player
    players.forEach(p => {
      const metrics = dailyLog.playerMetrics[p.id];
      if (metrics) {
        metrics.income = metrics.revenue - metrics.cogs;
      }
    });

    this.townLedger.push(dailyLog);

    // Increment day
    this.day++;

    return dailyLog;
  }

  /**
   * Computes the attraction score of a business for customers.
   * Probability matrix helper.
   */
  calculateBusinessScore(prop) {
    // 1. Ad awareness boost (1.0x to 3.0x)
    const adMultiplier = 1.0 + prop.adAwareness * 2.0;

    // 2. Customer satisfaction rating multiplier (0.3x to 1.0x)
    const satisfactionMultiplier = prop.customerSatisfaction;

    // 3. Price attractiveness
    const targetPrice = this.targetPrices[prop.type] || 30;
    let priceScore = 1.0;

    if (this.affluence === 'Low') {
      // Extremely price sensitive
      if (prop.price > targetPrice) {
        // Severe penalty for pricing above average
        priceScore = Math.max(0.01, 1.0 - ((prop.price - targetPrice) / targetPrice) * 1.5);
      } else {
        // Bonus for discount prices
        priceScore = 1.0 + ((targetPrice - prop.price) / targetPrice) * 0.5;
      }
    } else if (this.affluence === 'Medium') {
      // Normal price sensitivity
      if (prop.price > targetPrice) {
        priceScore = Math.max(0.1, 1.0 - ((prop.price - targetPrice) / targetPrice) * 0.8);
      } else {
        priceScore = 1.0 + ((targetPrice - prop.price) / targetPrice) * 0.2;
      }
    } else {
      // High Affluence: Not price sensitive, prefers upgraded locations
      // Premium pricing is tolerated up to 50% above target
      if (prop.price > targetPrice * 1.5) {
        priceScore = Math.max(0.2, 1.0 - ((prop.price - targetPrice * 1.5) / targetPrice));
      } else {
        priceScore = 1.0;
      }
      // Upgraded buildings draw more wealthy customers
      priceScore *= (1.0 + (prop.upgradeLevel - 1) * 0.15);
    }

    // Multiply scores together
    return adMultiplier * satisfactionMultiplier * priceScore;
  }

  /**
   * Helper to record daily metrics for a specific player during simulation.
   */
  recordPlayerRevenue(playerId, amount, customersCount = 0) {
    if (this.currentDailyLog && this.currentDailyLog.playerMetrics[playerId]) {
      this.currentDailyLog.playerMetrics[playerId].revenue += amount;
      this.currentDailyLog.playerMetrics[playerId].customersServed += customersCount;
    }
  }

  /**
   * Helper to record daily COGS for a specific player during simulation.
   */
  recordPlayerCogs(playerId, amount) {
    if (this.currentDailyLog && this.currentDailyLog.playerMetrics[playerId]) {
      this.currentDailyLog.playerMetrics[playerId].cogs += amount;
    }
  }

  /**
   * Finds the best active farm in town for town-owned properties to purchase from.
   * Prioritizes lowest wholesale price with inventory > 0.
   */
  findBestFarmForTownPurchase() {
    if (!this.currentProperties) return null;
    const farms = this.currentProperties.filter(p => p.type === 'Farm' && p.inventory > 0);
    if (farms.length === 0) return null;
    
    // Sort ascending by wholesale price
    farms.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
    return farms[0];
  }
}
