
/**
 * Calculates total delivery price for single or multi-drop with optional return.
 * @param {Object} config
 * @param {string} config.vehicle - 'motorbike' | 'car' | 'smallVan' | 'mediumVan'
 * @param {Array} config.drops - [{ miles: number }]
 * @param {number} config.totalWeight - in kg
 * @param {string} config.bookingTime - 'HH:MM' 24-hour format
 * @param {Array} config.waitingTimes - minutes at each stop [pickup, drop1, ...]
 * @param {Array} config.isInCentralLondon - [pickup, drop1, ..., returnDrop]
 * @param {boolean} config.isReturnTrip - true if there's a return journey
 * @param {boolean} config.returnToSamePickup - true if return is to pickup point
 * @param {number} config.returnMiles - miles from last drop to return point
 * @returns {number} - Total delivery price in GBP
 */

function calculateRunCourierPrice(config) {
  const {
    vehicle,
    drops,
    totalWeight,
    bookingTime,
    waitingTimes,
    isInCentralLondon,
    isReturnTrip = false,
    returnToSamePickup = true,
    returnMiles = 0
  } = config;

  const vehiclePricing = {
    motorbike: { base: 5, rate: 1.30,   rushRate: 1.50, maxWeight: 5 },
    car:       { base: 18, rate: 1.20, rushRate: 1.40, maxWeight: 50 },
    smallVan:  { base: 18, rate: 1.30, rushRate: 1.60, maxWeight: 400 },
    mediumVan: { base: 25, rate: 1.40, rushRate: 1.70, maxWeight: 750 }
  };

  const weightSurcharge = (weight) => {
    if (weight <= 10) return 0;
    if (weight <= 20) return 10;
    if (weight <= 30) return 15;
    if (weight <= 50) return 20;
    return 40;
  };

  const isRushHour = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    return (mins >= 420 && mins <= 600) || (mins >= 960 && mins <= 1140);
  };

  const getRate = (v, time) => isRushHour(time) ? vehiclePricing[v].rushRate : vehiclePricing[v].rate;

  let totalPrice = 0;
  const pricing = vehiclePricing[vehicle];
  const rate = getRate(vehicle, bookingTime);

  drops.forEach((leg, i) => {
    const isFirstLeg = i === 0;
    const miles = leg.miles;
    let legPrice = 0;

    if (isFirstLeg) legPrice += pricing.base;
    legPrice += miles * rate;
    if (!isFirstLeg) legPrice += 5;
    legPrice += weightSurcharge(totalWeight);
    if (isInCentralLondon[i + 1]) legPrice += 15;

    const waiting = waitingTimes[i];
    if (waiting > 10) legPrice += (waiting - 10) * 0.5;

    totalPrice += legPrice;
  });

  if (isReturnTrip && returnMiles > 0) {
    let returnPrice = 0;
    if (returnToSamePickup) {
      returnPrice += returnMiles * rate * 0.75;
    } else {
      returnPrice += returnMiles * rate;
      returnPrice += weightSurcharge(totalWeight);
      if (isInCentralLondon[drops.length]) returnPrice += 15;
      const returnWaiting = waitingTimes[drops.length];
      if (returnWaiting > 10) returnPrice += (returnWaiting - 10) * 0.5;
    }
    totalPrice += returnPrice;
  }

  return parseFloat(totalPrice.toFixed(2));
}
