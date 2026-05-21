/**
 * Represents an Entrepreneur player in the game.
 */
export default class Player {
  /**
   * @param {string} id - Unique identifier (e.g., 'player_1')
   * @param {string} name - The player's name
   * @param {string} color - The hex/rgb color code associated with the player
   * @param {number} startingCash - Initial cash amount
   */
  constructor(id, name, color, startingCash = 50000) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.cash = startingCash;
    this.debt = 0;

    // Skills are rated 0-10
    this.skills = {
      technology: 1, // Reduces equipment upgrade costs
      social: 1,     // Lowers interest rates and increases customer satisfaction
      planning: 1,   // Reduces property purchase prices and maintenance costs
      marketing: 1,  // Multiplies effectiveness of ad campaigns
      management: 1  // Reduces employee / operational costs
    };

    // Keep track of transaction ledger for the current day
    this.ledger = [];
  }

  /**
   * Calculates the Net Worth of the player.
   * Net Worth = Cash + Asset Value - Debt
   * @param {Array} properties - List of all properties in the game
   * @returns {number}
   */
  getNetWorth(properties) {
    const ownedProperties = properties.filter(p => p.owner === this);
    const assetValue = ownedProperties.reduce((sum, p) => sum + p.getValue(), 0);
    return this.cash + assetValue - this.debt;
  }

  /**
   * Borrows money from a bank.
   * @param {number} amount
   * @param {number} interestRate - The base interest rate from the bank
   */
  borrow(amount, interestRate) {
    if (this.debt + amount > 50000) {
      return null;
    }
    // Interest rate discount from social skill
    // Up to 50% discount on the interest rate at level 10
    const discount = Math.min(0.5, (this.skills.social - 1) * 0.05);
    const adjustedRate = interestRate * (1 - discount);
    
    this.cash += amount;
    this.debt += amount;
    
    this.logTransaction('Loan Borrowed', amount, `Borrowed at ${(adjustedRate * 100).toFixed(1)}% interest`);
    return adjustedRate;
  }

  /**
   * Repays debt.
   * @param {number} amount
   */
  repayDebt(amount) {
    const payment = Math.min(amount, this.debt, this.cash);
    this.cash -= payment;
    this.debt -= payment;
    this.logTransaction('Loan Repayment', -payment, `Paid off ${payment} debt`);
    return payment;
  }

  /**
   * Applies interest charge to the debt.
   * @param {number} rate - Daily interest rate (annual interest rate / 365 or a fixed daily rate)
   * @returns {number} The interest charge amount added to debt
   */
  accrueInterest(rate) {
    if (this.debt <= 0) return 0;
    
    const discount = Math.min(0.5, (this.skills.social - 1) * 0.05);
    const adjustedRate = rate * (1 - discount);
    const interest = Math.round(this.debt * adjustedRate);
    
    this.debt += interest;
    this.logTransaction('Interest Accrued', -interest, `Accrued interest on debt`);
    return interest;
  }

  /**
   * Log transaction in player ledger.
   */
  logTransaction(type, amount, description = '') {
    this.ledger.push({
      type,
      amount,
      description,
      cashAfter: this.cash,
      timestamp: Date.now()
    });
  }

  /**
   * Clear daily ledger.
   */
  clearLedger() {
    this.ledger = [];
  }

  /**
   * Upgrades a skill. Cost increases exponentially.
   * @param {string} skillName
   * @returns {boolean} Whether upgrade was successful
   */
  upgradeSkill(skillName) {
    if (this.skills[skillName] === undefined) return false;
    if (this.skills[skillName] >= 10) return false; // Max level

    const cost = this.getSkillUpgradeCost(skillName);
    if (this.cash < cost) return false;

    this.cash -= cost;
    this.skills[skillName]++;
    this.logTransaction('Skill Upgrade', -cost, `Upgraded ${skillName} to level ${this.skills[skillName]}`);
    return true;
  }

  /**
   * Calculates the cost of upgrading a skill.
   */
  getSkillUpgradeCost(skillName) {
    const currentLevel = this.skills[skillName];
    // Base cost is 200, multiplying by 1.5 each level
    return 200 * Math.pow(1.5, currentLevel - 1);
  }

  // --- Skill Modifiers ---

  /**
   * Discount modifier for property purchase prices & maintenance.
   * 4% reduction per planning skill point, max 40% discount (at level 10)
   */
  getPlanningModifier() {
    return Math.min(0.40, (this.skills.planning - 1) * 0.04);
  }

  /**
   * Cost reduction modifier for equipment upgrades.
   * 5% reduction per technology skill point, max 50% discount (at level 10)
   */
  getTechnologyModifier() {
    return Math.min(0.50, (this.skills.technology - 1) * 0.05);
  }

  /**
   * Cost reduction modifier for operational/employee costs.
   * 5% reduction per management skill point, max 50% discount (at level 10)
   */
  getManagementModifier() {
    return Math.min(0.50, (this.skills.management - 1) * 0.05);
  }

  /**
   * Multiplier modifier for advertisement effectiveness.
   * +15% effectiveness per marketing point (e.g. level 1 = 1.0x, level 10 = 2.35x)
   */
  getMarketingModifier() {
    return 1 + (this.skills.marketing - 1) * 0.15;
  }

  /**
   * Modifier for customer satisfaction.
   * +3% satisfaction per social point, max +30% (at level 10)
   */
  getSocialSatisfactionModifier() {
    return (this.skills.social - 1) * 0.03;
  }
}
