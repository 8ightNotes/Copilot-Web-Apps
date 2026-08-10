const {
  DEFAULT_START_DAY,
  DEFAULT_START_MINUTE,
  MINUTES_PER_DAY,
} = require('./constants');

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatClock(minuteOfDay) {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${pad(minutes)} ${suffix}`;
}

class SimulationTime {
  constructor(day = DEFAULT_START_DAY, minuteOfDay = DEFAULT_START_MINUTE) {
    this.day = day;
    this.minuteOfDay = minuteOfDay;
  }

  advance(minutes) {
    if (!Number.isInteger(minutes) || minutes < 0) {
      throw new TypeError('Simulation time can only advance by a non-negative integer.');
    }

    this.minuteOfDay += minutes;
    while (this.minuteOfDay >= MINUTES_PER_DAY) {
      this.minuteOfDay -= MINUTES_PER_DAY;
      this.day += 1;
    }
  }

  getLabel() {
    return `Day ${this.day} · ${formatClock(this.minuteOfDay)}`;
  }

  getPeriod() {
    if (this.minuteOfDay < 12 * 60) {
      return 'morning';
    }
    if (this.minuteOfDay < 17 * 60) {
      return 'afternoon';
    }
    if (this.minuteOfDay < 21 * 60) {
      return 'evening';
    }
    return 'night';
  }

  toJSON() {
    return {
      day: this.day,
      minuteOfDay: this.minuteOfDay,
      clock: formatClock(this.minuteOfDay),
      label: this.getLabel(),
      period: this.getPeriod(),
    };
  }
}

module.exports = {
  SimulationTime,
  formatClock,
};
