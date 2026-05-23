/**
 * Represents a cooperative town development project or event.
 */
export class TownDevelopmentProject {
  constructor({ id, name, cost, description, type, duration = 0 }) {
    this.id = id;
    this.name = name;
    this.cost = cost;
    this.description = description;
    this.type = type; // 'temporary' | 'permanent'
    this.duration = duration; // active duration in days (only for 'temporary')
    
    this.fundedAmount = 0;
    this.activeDaysLeft = 0; // days left for temporary events
    this.isCompleted = false; // status for permanent upgrades

    // Joint Venture Proposal State
    this.jvActive = false;
    this.jvParticipants = []; // Array of player IDs (e.g. ['p_0', 'p_1'])
    this.jvFundingMethods = {}; // { playerId: 'cash' | 'loan' }
  }

  /**
   * Checks if the project has reached its required funding.
   */
  isFullyFunded() {
    return this.fundedAmount >= this.cost;
  }

  /**
   * Checks if the project benefits are currently active.
   */
  isActive() {
    if (this.type === 'permanent') {
      return this.isCompleted;
    }
    return this.activeDaysLeft > 0;
  }

  /**
   * Contributes money from a player to this project.
   * Returns the actual amount contributed.
   */
  contribute(amount, player) {
    if (this.isActive() && this.type === 'permanent') {
      return 0; // Already built permanently
    }

    const remaining = this.cost - this.fundedAmount;
    const contribution = Math.min(amount, remaining, player.cash);

    if (contribution <= 0) return 0;

    player.cash -= contribution;
    this.fundedAmount += contribution;
    player.logTransaction('Town Project Fund', -contribution, `Contributed to ${this.name}`);

    if (this.isFullyFunded()) {
      if (this.type === 'permanent') {
        this.isCompleted = true;
      } else {
        this.activeDaysLeft = this.duration;
      }
    }

    return contribution;
  }

  /**
   * Starts a Joint Venture proposal.
   */
  startJointVenture() {
    this.jvActive = true;
    this.jvParticipants = [];
    this.jvFundingMethods = {};
  }

  /**
   * Cancels a Joint Venture proposal.
   */
  cancelJointVenture() {
    this.jvActive = false;
    this.jvParticipants = [];
    this.jvFundingMethods = {};
  }

  /**
   * Toggles a participant in the Joint Venture.
   */
  toggleJvParticipant(playerId) {
    const idx = this.jvParticipants.indexOf(playerId);
    if (idx > -1) {
      this.jvParticipants.splice(idx, 1);
      delete this.jvFundingMethods[playerId];
    } else {
      this.jvParticipants.push(playerId);
      this.jvFundingMethods[playerId] = 'cash'; // default
    }
  }

  /**
   * Sets the funding method for a participant.
   */
  setJvFundingMethod(playerId, method) {
    if (this.jvParticipants.includes(playerId)) {
      this.jvFundingMethods[playerId] = method;
    }
  }

  /**
   * Executes the Joint Venture by gathering funding from all participants.
   * Returns true if successful, false otherwise.
   */
  executeJointVenture(players, town) {
    if (!this.jvActive || this.jvParticipants.length < 2) return false;

    const remaining = this.cost - this.fundedAmount;
    if (remaining <= 0) return false;

    const share = Math.ceil(remaining / this.jvParticipants.length);

    // Verify cash for cash-funded participants
    for (const playerId of this.jvParticipants) {
      const player = players.find(p => p.id === playerId);
      if (!player) return false;
      const method = this.jvFundingMethods[playerId] || 'cash';
      if (method === 'cash' && player.cash < share) {
        return false; // Player cannot afford their share of cash contribution
      }
    }

    // Execute contribution
    let totalContributed = 0;
    this.jvParticipants.forEach((playerId, index) => {
      const player = players.find(p => p.id === playerId);
      const method = this.jvFundingMethods[playerId] || 'cash';
      
      const actualShare = (index === this.jvParticipants.length - 1) ? (remaining - totalContributed) : share;

      if (method === 'cash') {
        player.cash -= actualShare;
        player.logTransaction('Town Project Fund (JV)', -actualShare, `Contributed to ${this.name} via Joint Venture`);
      } else {
        // Take loan bypass
        const bankProp = town.currentProperties
          ? town.currentProperties.filter(p => p.type === 'Bank').sort((a, b) => a.interestRate - b.interestRate)[0]
          : null;
        const baseRate = bankProp ? bankProp.interestRate : 0.18;
        const discount = Math.min(0.5, (player.skills.social - 1) * 0.05);
        const adjustedRate = baseRate * (1 - discount);

        player.projectDebt += actualShare;
        player.debt = player.regularDebt + player.projectDebt;

        player.logTransaction('Town Project Loan (JV)', actualShare, `Borrowed for ${this.name} Joint Venture at ${(adjustedRate * 100).toFixed(1)}% interest`);
        player.logTransaction('Town Project Fund (JV)', -actualShare, `Contributed to ${this.name} via Joint Venture`);
        
        if (bankProp) {
          bankProp.totalLoansIssued++;
        }
      }

      this.fundedAmount += actualShare;
      totalContributed += actualShare;
    });

    // Mark as completed if fully funded
    if (this.isFullyFunded()) {
      if (this.type === 'permanent') {
        this.isCompleted = true;
      } else {
        this.activeDaysLeft = this.duration;
      }

      let logMsg = `🎉 Town Project Completed: ${this.name} (Joint Venture by ${this.jvParticipants.map(pid => players.find(p => p.id === pid).name).join(', ')})!`;

      if (this.id === 'business_expo') {
        if (town && town.currentProperties) {
          town.currentProperties.forEach(prop => {
            if (prop.adAwareness !== undefined) {
              prop.adAwareness = Math.min(1.0, prop.adAwareness + 0.35);
            }
          });
        }
        logMsg += ` All businesses have gained +35% advertising awareness.`;
      } else if (this.id === 'aura_heights') {
        let popBoostText = '';
        if (town) {
          const popBoost = Math.round(town.population * 0.30);
          town.population += popBoost;
          popBoostText = ` Immediately added +${popBoost.toLocaleString()} residents (population is now ${town.population.toLocaleString()}).`;
        }
        logMsg += ` A new luxury housing sector has been constructed on the map.${popBoostText}`;
      }

      if (town && town.currentDailyLog) {
        town.currentDailyLog.events.push(logMsg);
      } else if (town) {
        town.townLedger.push({
          day: town.day,
          type: 'project_completed',
          events: [logMsg]
        });
      }
    }

    this.cancelJointVenture();
    return true;
  }

  /**
   * Advance the active duration of temporary events daily.
   */
  advanceDay(town) {
    if (this.type === 'temporary' && this.activeDaysLeft > 0) {
      this.activeDaysLeft--;
      if (this.activeDaysLeft === 0) {
        // Reset funding so it can be sponsored again in the future
        this.fundedAmount = 0;
        if (town && town.currentDailyLog) {
          town.currentDailyLog.events.push(`⚠️ The ${this.name} event has concluded.`);
        }
      }
    }
  }
}

/**
 * Manages all active town development projects.
 */
export class TownDevelopmentManager {
  constructor() {
    this.projects = [
      new TownDevelopmentProject({
        id: 'concert_series',
        name: 'Concert Series',
        cost: 12000,
        description: 'Host a seasonal music festival in the central square. Increases visitor purchasing frequency by +0.5 daily for all residents.',
        type: 'temporary',
        duration: 8
      }),
      new TownDevelopmentProject({
        id: 'public_transit',
        name: 'Public Transportation',
        cost: 20000,
        description: 'Establish a town-wide clean trolley line. Increases daily population growth rate by 50%, reduces population decline by 33%, and sets the minimum population floor to 100.',
        type: 'permanent'
      }),
      new TownDevelopmentProject({
        id: 'business_expo',
        name: 'Business Expo',
        cost: 10000,
        description: 'Host a regional corporate showcase. Immediately increases all businesses\' ad awareness by +35% (does not decay below 25% for 5 days).',
        type: 'temporary',
        duration: 5
      }),
      new TownDevelopmentProject({
        id: 'aura_heights',
        name: 'Aura Heights Housing',
        cost: 30000,
        description: 'Build a premium residential district. Immediately increases town population by 30%, boosts daily growth rate by 30%, and spawns a new luxury housing zone on the map, boosting town affluence.',
        type: 'permanent'
      })
    ];
  }

  /**
   * Gets a project by its unique ID.
   */
  getProject(id) {
    return this.projects.find(p => p.id === id);
  }

  /**
   * Checks if a project is active.
   */
  isProjectActive(id) {
    const p = this.getProject(id);
    return p ? p.isActive() : false;
  }

  /**
   * Checks if a permanent project is completed.
   */
  isProjectCompleted(id) {
    const p = this.getProject(id);
    return p ? (p.type === 'permanent' && p.isCompleted) : false;
  }

  /**
   * Contributes to a project. If completed, triggers special immediate side effects.
   */
  contributeToProject(id, amount, player, town) {
    const p = this.getProject(id);
    if (!p) return 0;

    const wasActive = p.isActive();
    const contribution = p.contribute(amount, player);

    if (contribution > 0 && !wasActive && p.isActive()) {
      // Just activated / completed!
      let logMsg = `🎉 Town Project Completed: ${p.name}!`;
      
      if (p.id === 'business_expo') {
        // Expo immediate effect: increase all properties' ad awareness by 35%
        if (town && town.currentProperties) {
          town.currentProperties.forEach(prop => {
            if (prop.adAwareness !== undefined) {
              prop.adAwareness = Math.min(1.0, prop.adAwareness + 0.35);
            }
          });
        }
        logMsg += ` All businesses have gained +35% advertising awareness.`;
      } else if (p.id === 'aura_heights') {
        let popBoostText = '';
        if (town) {
          const popBoost = Math.round(town.population * 0.30);
          town.population += popBoost;
          popBoostText = ` Immediately added +${popBoost.toLocaleString()} residents (population is now ${town.population.toLocaleString()}).`;
        }
        logMsg += ` A new luxury housing sector has been constructed on the map.${popBoostText}`;
      }

      if (town && town.currentDailyLog) {
        town.currentDailyLog.events.push(logMsg);
      } else if (town) {
        // If contributed during active turn, record under general events log
        town.townLedger.push({
          day: town.day,
          type: 'project_completed',
          events: [logMsg]
        });
      }
    }

    return contribution;
  }

  /**
   * Advances the duration of all active projects at the end of the day.
   */
  advanceDay(town) {
    this.projects.forEach(p => p.advanceDay(town));
  }
}
