import httpStatus from "http-status";
import ApiError from "../errors/ApiErrors";
import { getLatLngFromPostalCode } from "./getLatLong";
import { haversineDistance } from "./haverSineDistance";
import { isCentralLondonPostcode } from "./isCentralLondonPostcode";

export type VehicleType = 'motorbike' | 'car' | 'smallVan' | 'mediumVan';


export interface DeliveryRequestInput {
  service: VehicleType;
  pickup: string;
  delivery: string[];
  country: string;
  weight: number;
  time: string; // HH:MM
  waitingTime: number; // ✅ single value now
  isReturnTrip?: boolean;
  returnToSamePickup?: boolean;
}

export const calculateRunCourierPrice = async (input: DeliveryRequestInput): Promise<number> => {
  const {
    service,
    pickup,
    delivery,
    country,
    weight,
    time,
    waitingTime,
    isReturnTrip = false,
    returnToSamePickup = true
  } = input;

  
const totalWeight = Number(weight);


  //   const vehiclePricing = {
  //   motorbike: { base: 5, rate: 2.5,   rushRate: 3.0, maxWeight: 10 },
  //   car:       { base: 25, rate: 1.20, rushRate: 1.40, maxWeight: 50 },
  //   smallVan:  { base: 25, rate: 1.30, rushRate: 1.50, maxWeight: 400 },
  //   mediumVan: { base: 25, rate: 1.40, rushRate: 1.60, maxWeight: 750 }
  // };

      const vehiclePricing = {
    motorbike: { base: 5, rate: 1.30,   rushRate: 1.50, maxWeight: 5 },
    car:       { base: 18, rate: 1.20, rushRate: 1.40, maxWeight: 50 },
    smallVan:  { base: 18, rate: 1.30, rushRate: 1.60, maxWeight: 400 },
    mediumVan: { base: 25, rate: 1.40, rushRate: 1.70, maxWeight: 750 }
  };
if (service === "motorbike") {
  if (weight > 50) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "Motorbike service does not support deliveries over 50kg. Please choose a different vehicle type."
    );
  }
}

  const getRate = (v: VehicleType, totalMinutes: number) => {
    const isRushHour =
      (totalMinutes >= 420 && totalMinutes < 600) || 
      (totalMinutes >= 960 && totalMinutes < 1140);

    const pricing = vehiclePricing[v];
    if (!pricing) throw new Error(`Invalid vehicle type: ${v}`);
    return isRushHour ? pricing.rushRate : pricing.rate;
  };

  const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const getWeightSurcharge = (weight: number): number => {
    if (weight <= 10) return 0;
    if (weight <= 20) return 10;
    if (weight <= 30) return 20;
    if (weight <= 40) return 30;
    if (weight <= 50) return 40;
    return 40;
  };

  const pickupPoint = await getLatLngFromPostalCode(pickup, country);
  const dropPoints = await Promise.all(delivery.map(loc => getLatLngFromPostalCode(loc, country)));

  const drops: { miles: number }[] = [];
  let lastPoint = pickupPoint;

  for (const point of dropPoints) {

    const miles = haversineDistance(lastPoint.latitude, lastPoint.longitude, point.latitude, point.longitude);
//  console.log({miles});
    drops.push({ miles });
    lastPoint = point;
  }

  const returnMiles = isReturnTrip
    ? haversineDistance(lastPoint.latitude, lastPoint.longitude, pickupPoint.latitude, pickupPoint.longitude)
    : 0;

  const allPostcodes = [pickup, ...delivery, ...(isReturnTrip ? [pickup] : [])];
  const centralFlags = allPostcodes.map(p => isCentralLondonPostcode(p));

  const bookingMinutes = parseTimeToMinutes(time);
  const rate = getRate(service, bookingMinutes);
  const pricing = vehiclePricing[service];

  let totalPrice = 0;

  drops.forEach((leg, i) => {
    let legPrice = i === 0 ? pricing.base : 5;
    legPrice += leg.miles * rate;
    legPrice += getWeightSurcharge(totalWeight);

    if (waitingTime > 10) legPrice += (waitingTime - 10) * 0.5;
    if (centralFlags[i + 1]) legPrice += 15;

    totalPrice += legPrice;
  });

  if (isReturnTrip && returnMiles > 0) {
    let returnPrice = returnToSamePickup
      ? returnMiles * rate * 0.75
      : returnMiles * rate + getWeightSurcharge(totalWeight);

    if (waitingTime > 10) {
      returnPrice += (waitingTime - 10) * 0.5;
    }
    if (!returnToSamePickup && centralFlags[delivery.length + 1]) {
      returnPrice += 15;
    }

    totalPrice += returnPrice;
  }

  return +totalPrice.toFixed(2);
};
