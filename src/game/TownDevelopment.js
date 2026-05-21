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
        description: 'Establish a town-wide clean trolley line. Increases daily population growth rate by 50% and sets the minimum population floor to 100.',
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
