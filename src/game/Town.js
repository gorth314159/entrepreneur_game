import { TownDevelopmentManager } from './TownDevelopment.js';

/**
 * Manages the autonomous town population, customer logic, economic health, and simulation phase.
 */
export default class Town {
  constructor(startingPopulation = 150) {
    this.startingPopulation = startingPopulation;
    this.population = startingPopulation; // Starting population (customers)
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
    this.developmentManager = new TownDevelopmentManager();
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

    // Advance town projects first
    this.developmentManager.advanceDay(this);

    // Execute auto-purchases for all properties that have auto-purchase enabled
    properties.forEach(prop => {
      if (typeof prop.performAutoPurchase === 'function') {
        prop.performAutoPurchase(properties, this);
      }
    });

    // 1. Calculate general town economic health based on the lowest price in each industry
    // Economic health is higher if business prices are reasonable, ad campaigns are active, and cash flows.
    const b2cTypes = ['GroceryStore', 'Restaurant', 'RetailStore', 'MechanicShop'];
    let ratioSum = 0;
    b2cTypes.forEach(type => {
      const locations = properties.filter(p => p.type === type);
      const target = this.targetPrices[type] || 30;
      if (locations.length > 0) {
        const minPrice = Math.min(...locations.map(l => l.price));
        ratioSum += minPrice / target;
      } else {
        ratioSum += 1.0;
      }
    });
    let avgPriceRatio = ratioSum / b2cTypes.length;

    // High prices harm economic health. Ads and upgrades boost it.
    let adBoost = properties.reduce((sum, p) => sum + (p.adAwareness || 0), 0) / properties.length;
    let econHealth = 1.0 - (avgPriceRatio - 1.0) * 0.4 + adBoost * 0.3;
    econHealth = Math.max(0.5, Math.min(1.8, econHealth));

    // 2. Adjust Town Population (Migration)
    // Population grows if economy is healthy, shrinks if poor
    const isTransitActive = this.developmentManager.isProjectActive('public_transit');
    const isHeightsActive = this.developmentManager.isProjectActive('aura_heights');
    
    let transitMultiplier = 1.0;
    if (isTransitActive) {
      if (econHealth >= 1.0) {
        transitMultiplier = 1.5;
      } else {
        transitMultiplier = 1 / 1.5;
      }
    }
    
    const heightsMultiplier = isHeightsActive ? 1.3 : 1.0;
    const baseMigrationRate = 0.12;
    
    let populationChange = 0;
    if (econHealth > 1.0) {
      // Drastically increase population growth for a healthy economy.
      // Target adding 5-10 people per day under typical healthy conditions (econHealth 1.05 to 1.15).
      const baseGrowthRate = 0.35;
      const flatGrowth = 4.5;
      // Scale flat boost when econHealth is close to 1.0 to ensure a smooth transition
      const scaleFactor = Math.min(1.0, (econHealth - 1.0) / 0.05); // reaches 1.0 at econHealth = 1.05
      const growthAmt = this.population * (econHealth - 1.0) * baseGrowthRate + flatGrowth * scaleFactor;
      populationChange = Math.round(growthAmt * transitMultiplier * heightsMultiplier);
    } else if (econHealth < 1.0) {
      // Population decline remains natural
      populationChange = Math.round(this.population * (econHealth - 1.0) * baseMigrationRate * transitMultiplier * heightsMultiplier);
    }
    
    const scaleFactor = this.startingPopulation / 150;
    const minPop = (isTransitActive ? 100 : 50) * scaleFactor;
    const maxPop = 500 * scaleFactor;
    this.population = Math.max(minPop, Math.min(maxPop, this.population + populationChange));
    
    if (populationChange > 0) {
      dailyLog.events.push(`${populationChange} new residents moved to town due to favorable economic conditions.`);
    } else if (populationChange < 0) {
      dailyLog.events.push(`${Math.abs(populationChange)} residents left town due to high cost of living.`);
    }

    // 3. Shift Affluence
    // Affluence is based on average price index and population level
    const affluenceBonus = this.developmentManager.isProjectActive('aura_heights') ? 0.3 : 0;
    const currentScore = econHealth * (this.population / this.startingPopulation) + affluenceBonus;
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
    const concertBonus = this.developmentManager.isProjectActive('concert_series') ? 0.5 : 0;
    const transactionsPerResident = (this.affluence === 'High' ? 2 : this.affluence === 'Medium' ? 1.5 : 1.0) + concertBonus;
    const totalVisits = Math.floor(this.population * transactionsPerResident);

    // Group B2C properties by type for comparison
    const propertiesByType = {};
    b2cTypes.forEach(type => {
      propertiesByType[type] = properties.filter(p => p.type === type);
    });

    // We will check active player-owned banks dynamically for transaction fee splitting below

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

          const eligibleBanks = properties.filter(p => p.type === 'Bank' && p.owner && p.owner !== selectedProp.owner);
          if (eligibleBanks.length > 0) {
            const totalFee = Math.round(revenueEarned * 0.04);
            if (totalFee > 0) {
              const feePerBank = Math.round(totalFee / eligibleBanks.length);
              if (feePerBank > 0) {
                eligibleBanks.forEach(bank => {
                  bank.owner.cash += feePerBank;
                  bank.owner.logTransaction('Bank Transaction Fee', feePerBank, `Processing fee from ${selectedProp.name} (Split)`);
                  this.recordPlayerRevenue(bank.owner.id, feePerBank, 0);
                });
              }
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
    // Let's see all active Banks owned by players
    const ownedBanks = properties.filter(p => p.type === 'Bank' && p.owner !== null);
    
    players.forEach(player => {
      if (player.debt > 0) {
        // Accrue daily interest based on the average interest rate of all active player-owned banks, or default 18%
        const bankInterestRate = ownedBanks.length > 0 
          ? (ownedBanks.reduce((sum, b) => sum + b.interestRate, 0) / ownedBanks.length) 
          : 0.18;
        const dailyInterestRate = bankInterestRate / 30;
        
        const interestPaid = player.accrueInterest(dailyInterestRate);
        
        // Distribute the interest paid equally among all player-owned banks (excluding the borrower)
        const recipientBanks = ownedBanks.filter(b => b.owner !== player);
        if (interestPaid > 0 && recipientBanks.length > 0) {
          const interestPerBank = Math.round(interestPaid / recipientBanks.length);
          if (interestPerBank > 0) {
            recipientBanks.forEach(bank => {
              bank.owner.cash += interestPerBank;
              bank.owner.logTransaction('Bank Loan Revenue', interestPerBank, `Received loan interest from ${player.name} (Split)`);
              this.recordPlayerRevenue(bank.owner.id, interestPerBank, 0);
            });
          }
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
        priceScore = Math.max(0.01, 1.0 - ((prop.price - targetPrice) / targetPrice) * 0.8);
      } else {
        priceScore = 1.0 + ((targetPrice - prop.price) / targetPrice) * 0.2;
      }
    } else {
      // High Affluence: Not price sensitive, prefers upgraded locations
      // Premium pricing is tolerated up to 50% above target
      if (prop.price > targetPrice * 1.5) {
        priceScore = Math.max(0.01, 1.0 - ((prop.price - targetPrice * 1.5) / targetPrice));
      } else {
        priceScore = 1.0;
      }
      // Upgraded buildings draw more wealthy customers
      priceScore *= (1.0 + (prop.upgradeLevel - 1) * 0.15);
    }

    // 4. Price Hike Penalty compared to the rest of the industry
    let priceHikePenalty = 1.0;
    const industryLocations = (this.currentProperties || []).filter(p => p.type === prop.type);
    if (industryLocations.length > 0) {
      const minPrice = Math.min(...industryLocations.map(l => l.price));
      if (prop.price > minPrice) {
        priceHikePenalty = Math.pow(minPrice / prop.price, 3.0);
      }
    }

    // Multiply scores together
    return adMultiplier * satisfactionMultiplier * priceScore * priceHikePenalty;
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
