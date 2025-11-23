
// // import httpStatus from "http-status";
// // import ApiError from "../errors/ApiErrors";
// // import axios from "axios";

// // export type VehicleType = "motorbike" | "car" | "smallVan" | "mediumVan";

// // export interface DeliveryRequestInput {
// //   service: VehicleType;
// //   pickup: string;
// //   delivery: string[];
// //   country: string;
// //   weight: number | string;      // Accept string or number
// //   time: string;                 // Format: HH:MM
// //   waitingTime?: number | string; // 💡 SINGLE value for all drops (like "0")
// //   returnTrip?: boolean;
// //   returnToSameLocation?: boolean;
// // }

// // // ✅ OpenStreetMap fallback (if needed later)
// // export const getLatLngFromPostalCode = async (postalCode: string, country: string) => {
// //   try {
// //     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postalCode + ' ' + country)}`;
// //     const response = await fetch(url, {
// //       headers: { "User-Agent": "your-app-name-here" },
// //     });
// //     const locations = await response.json();

// //     if (!locations || locations.length === 0) {
// //       throw new Error('No locations found for the given postal code.');
// //     }

// //     return {
// //       latitude: parseFloat(locations[0].lat),
// //       longitude: parseFloat(locations[0].lon)
// //     };
// //   } catch (error: any) {
// //     console.error('Error fetching from OpenStreetMap API:', error.message);
// //     throw error;
// //   }
// // };

// // // 🎯 Detect if a postcode is in Central London
// // export const isCentralLondonPostcode = (postcode: string): boolean => {
// //   const centralPrefixes = ['EC1', 'EC2', 'EC3', 'EC4', 'W1', 'WC1', 'WC2', 'SW1', 'SE1', 'NW1'];
// //   return centralPrefixes.some(prefix =>
// //     postcode.replace(/\s+/g, '').toUpperCase().startsWith(prefix)
// //   );
// // };

// // // 🚗 Get real road distance using Google Maps Distance Matrix API
// // export const getDrivingDistance = async (
// //   origin: string,
// //   destination: string
// // ): Promise<{ distanceInMiles: number; durationInMinutes: number }> => {
// //   const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDKh_wbcDcAMUeu-V9luJrVODl2CzJt6lQ";
// //   const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

// //   const response = await axios.get(url);
// //   const data = response.data;

// //   if (
// //     data.status !== "OK" ||
// //     !data.rows[0] ||
// //     data.rows[0].elements[0].status !== "OK"
// //   ) {
// //     throw new Error("Unable to retrieve driving distance");
// //   }

// //   const element = data.rows[0].elements[0];
// //   return {
// //     distanceInMiles: +(element.distance.value / 1609.34).toFixed(3),
// //     durationInMinutes: +(element.duration.value / 60).toFixed(2)
// //   };
// // };

// // // 🚀 MAIN LOGIC
// // export const calculateRunCourierPrice2 = async (
// //   input: DeliveryRequestInput
// // ): Promise<number> => {
// //   const {
// //     service,
// //     pickup,
// //     delivery,
// //     country,
// //     weight,
// //     time,
// //     waitingTime = 0, // 💡 Single value input
// //     returnTrip = false,
// //     returnToSameLocation = true
// //   } = input;

// //   const totalWeight = typeof weight === "string" ? parseFloat(weight) : weight;
// //   const parsedWaitTime = typeof waitingTime === "string" ? parseFloat(waitingTime) : waitingTime;

// //   const vehiclePricing = {
// //     motorbike: { base: 5, rate: 2.5, rushRate: 3.0, maxWeight: 10 },
// //     car: { base: 25, rate: 1.7, rushRate: 2.2, maxWeight: 50 },
// //     smallVan: { base: 25, rate: 1.8, rushRate: 2.4, maxWeight: 400 },
// //     mediumVan: { base: 25, rate: 1.9, rushRate: 2.5, maxWeight: 750 }
// //   };

// //   if (service === "motorbike" && totalWeight > 50) {
// //     throw new ApiError(
// //       httpStatus.NOT_ACCEPTABLE,
// //       "Motorbike service does not support deliveries over 50kg. Please choose a different vehicle type."
// //     );
// //   }

// //   const getRate = (v: VehicleType, totalMinutes: number) => {
// //     const isRushHour =
// //       (totalMinutes >= 420 && totalMinutes < 600) ||
// //       (totalMinutes >= 960 && totalMinutes < 1140);

// //     const pricing = vehiclePricing[v];
// //     if (!pricing) throw new Error(`Invalid vehicle type: ${v}`);
// //     return isRushHour ? pricing.rushRate : pricing.rate;
// //   };

// //   const parseTimeToMinutes = (timeStr: string): number => {
// //     const [h, m] = timeStr.split(":").map(Number);
// //     return h * 60 + m;
// //   };

// //   const getWeightSurcharge = (weight: number): number => {
// //     if (weight <= 10) return 0;
// //     if (weight <= 20) return 10;
// //     if (weight <= 30) return 20;
// //     if (weight <= 40) return 30;
// //     if (weight <= 50) return 40;
// //     return 40;
// //   };

// //   let totalPrice = 0;
// //   const bookingMinutes = parseTimeToMinutes(time);
// //   const rate = getRate(service, bookingMinutes);
// //   const pricing = vehiclePricing[service];

// //   let lastAddress = pickup;
// //   const allPostcodes = [pickup, ...delivery, ...(returnTrip ? [pickup] : [])];
// //   const centralFlags = allPostcodes.map(p => isCentralLondonPostcode(p));

// //   for (let i = 0; i < delivery.length; i++) {
// //     const dropAddress = delivery[i];
// //     const { distanceInMiles } = await getDrivingDistance(
// //       lastAddress + " " + country,
// //       dropAddress + " " + country
// //     );

    
// //     let legPrice = i === 0 ? pricing.base : 5;
// //     legPrice += distanceInMiles * rate;
// //     legPrice += getWeightSurcharge(totalWeight);

// //     if (parsedWaitTime > 10) {
// //       legPrice += (parsedWaitTime - 10) * 0.5;
// //     }

// //     if (centralFlags[i + 1]) legPrice += 15;

// //     totalPrice += legPrice;
// //     lastAddress = dropAddress;
// //   }

// //   // 📦 Handle Return Trip
// //   if (returnTrip) {
// //     const { distanceInMiles: returnMiles } = await getDrivingDistance(
// //       lastAddress + " " + country,
// //       pickup + " " + country
// //     );

// //     let returnPrice = returnMiles * rate * (returnToSameLocation ? 0.75 : 1);
// //     returnPrice += getWeightSurcharge(totalWeight);

// //     if (parsedWaitTime > 10) {
// //       returnPrice += (parsedWaitTime - 10) * 0.5;
// //     }

// //     if (!returnToSameLocation && centralFlags[delivery.length + 1]) {
// //       returnPrice += 15;
// //     }

// //     totalPrice += returnPrice;
// //   }

// //   return +totalPrice.toFixed(2);
// // };


// import httpStatus from "http-status";
// import ApiError from "../errors/ApiErrors";
// import axios from "axios";

// export type VehicleType = "motorbike" | "car" | "smallVan" | "mediumVan";

// export interface DeliveryRequestInput {
//   service: VehicleType;
//   pickup: string;
//   delivery: string[];
//   country: string;
//   weight: number | string;      // Accept string or number
//   time: string;                 // Format: HH:MM
//   waitingTime?: number | string; // Single value for all drops
//   returnTrip?: boolean;
//   returnToSameLocation?: boolean;
// }

// // OpenStreetMap fallback (if needed later)
// export const getLatLngFromPostalCode = async (postalCode: string, country: string) => {
//   try {
//     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postalCode + ' ' + country)}`;
//     const response = await fetch(url, {
//       headers: { "User-Agent": "your-app-name-here" },
//     });
//     const locations = await response.json();

//     if (!locations || locations.length === 0) {
//       throw new Error('No locations found for the given postal code.');
//     }

//     return {
//       latitude: parseFloat(locations[0].lat),
//       longitude: parseFloat(locations[0].lon)
//     };
//   } catch (error: any) {
//     console.error('Error fetching from OpenStreetMap API:', error.message);
//     throw error;
//   }
// };

// // Detect if a postcode is in Central London
// export const isCentralLondonPostcode = (postcode: string): boolean => {
//   const centralPrefixes = ['EC1', 'EC2', 'EC3', 'EC4', 'W1', 'WC1', 'WC2', 'SW1', 'SE1', 'NW1'];
//   return centralPrefixes.some(prefix =>
//     postcode.replace(/\s+/g, '').toUpperCase().startsWith(prefix)
//   );
// };

// // Get real road distance using Google Maps Distance Matrix API
// export const getDrivingDistance = async (
//   origin: string,
//   destination: string
// ): Promise<{ distanceInMiles: number; durationInMinutes: number }> => {
//   const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDKh_wbcDcAMUeu-V9luJrVODl2CzJt6lQ";
//   const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

//   const response = await axios.get(url);
//   const data = response.data;

//   if (
//     data.status !== "OK" ||
//     !data.rows[0] ||
//     data.rows[0].elements[0].status !== "OK"
//   ) {
//     throw new Error("Unable to retrieve driving distance");
//   }

//   const element = data.rows[0].elements[0];
//   return {
//     distanceInMiles: +(element.distance.value / 1609.34).toFixed(3),
//     durationInMinutes: +(element.duration.value / 60).toFixed(2)
//   };
// };

// // MAIN LOGIC - returns total price and total distance
// export const calculateRunCourierPrice2 = async (
//   input: DeliveryRequestInput
// ): Promise<{ totalPrice: number; totalDistance: number }> => {
//   const {
//     service,
//     pickup,
//     delivery,
//     country,
//     weight,
//     time,
//     waitingTime = 0,
//     returnTrip = false,
//     returnToSameLocation = true
//   } = input;

//   const totalWeight = typeof weight === "string" ? parseFloat(weight) : weight;
//   const parsedWaitTime = typeof waitingTime === "string" ? parseFloat(waitingTime) : waitingTime;

//       const vehiclePricing = {
//     motorbike: { base: 5, rate: 1.30,   rushRate: 1.50, maxWeight: 5 },
//     car:       { base: 18, rate: 1.20, rushRate: 1.40, maxWeight: 50 },
//     smallVan:  { base: 18, rate: 1.30, rushRate: 1.60, maxWeight: 400 },
//     mediumVan: { base: 25, rate: 1.40, rushRate: 1.70, maxWeight: 750 }
//   };

//   if (service === "motorbike" && totalWeight > 50) {
//     throw new ApiError(
//       httpStatus.NOT_ACCEPTABLE,
//       "Motorbike service does not support deliveries over 50kg. Please choose a different vehicle type."
//     );
//   }

//   const getRate = (v: VehicleType, totalMinutes: number) => {
//     const isRushHour =
//       (totalMinutes >= 420 && totalMinutes < 600) ||
//       (totalMinutes >= 960 && totalMinutes < 1140);

//     const pricing = vehiclePricing[v];
//     if (!pricing) throw new Error(`Invalid vehicle type: ${v}`);
//     return isRushHour ? pricing.rushRate : pricing.rate;
//   };

//   const parseTimeToMinutes = (timeStr: string): number => {
//     const [h, m] = timeStr.split(":").map(Number);
//     return h * 60 + m;
//   };

//   const getWeightSurcharge = (weight: number): number => {
//     if (weight <= 10) return 0;
//     if (weight <= 20) return 10;
//     if (weight <= 30) return 20;
//     if (weight <= 40) return 30;
//     if (weight <= 50) return 40;
//     return 40;
//   };

//   let totalPrice = 0;
//   let totalDistance = 0;

//   const bookingMinutes = parseTimeToMinutes(time);
//   const rate = getRate(service, bookingMinutes);
//   const pricing = vehiclePricing[service];

//   let lastAddress = pickup;
//   const allPostcodes = [pickup, ...delivery, ...(returnTrip ? [pickup] : [])];
//   const centralFlags = allPostcodes.map(p => isCentralLondonPostcode(p));

//   for (let i = 0; i < delivery.length; i++) {
//     const dropAddress = delivery[i];
//     const { distanceInMiles } = await getDrivingDistance(
//       lastAddress + " " + country,
//       dropAddress + " " + country
//     );

//     totalDistance += distanceInMiles;

//     let legPrice = i === 0 ? pricing.base : 5;
//     legPrice += distanceInMiles * rate;
//     legPrice += getWeightSurcharge(totalWeight);

//     if (parsedWaitTime > 10) {
//       legPrice += (parsedWaitTime - 10) * 0.5;
//     }

//     if (centralFlags[i + 1]) legPrice += 15;

//     totalPrice += legPrice;
//     lastAddress = dropAddress;
//   }

//   // Handle Return Trip
//   if (returnTrip) {
//     const { distanceInMiles: returnMiles } = await getDrivingDistance(
//       lastAddress + " " + country,
//       pickup + " " + country
//     );

//     totalDistance += returnMiles;

//     let returnPrice = returnMiles * rate * (returnToSameLocation ? 0.75 : 1);
//     returnPrice += getWeightSurcharge(totalWeight);

//     if (parsedWaitTime > 10) {
//       returnPrice += (parsedWaitTime - 10) * 0.5;
//     }

//     if (!returnToSameLocation && centralFlags[delivery.length + 1]) {
//       returnPrice += 15;
//     }

//     totalPrice += returnPrice;
//   }

//   return {
//     totalPrice: +totalPrice.toFixed(2),
//     totalDistance: +totalDistance.toFixed(2),
//   };
// };



// import httpStatus from "http-status";
// import ApiError from "../errors/ApiErrors";
// import axios from "axios";

// export type VehicleType = "motorbike" | "car" | "smallVan" | "mediumVan";

// export interface DeliveryRequestInput {
//   service: VehicleType;
//   pickup: string;
//   delivery: string[];
//   country: string;
//   weight: number | string;      // Accept string or number
//   time: string;                 // Format: HH:MM
//   waitingTime?: number | string; // Single value for all drops
//   returnTrip?: boolean;
//   returnToSameLocation?: boolean;
// }

// // OpenStreetMap fallback (if needed later)
// export const getLatLngFromPostalCode = async (postalCode: string, country: string) => {
//   try {
//     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postalCode + ' ' + country)}`;
//     const response = await fetch(url, {
//       headers: { "User-Agent": "your-app-name-here" },
//     });
//     const locations = await response.json();

//     if (!locations || locations.length === 0) {
//       throw new Error('No locations found for the given postal code.');
//     }

//     return {
//       latitude: parseFloat(locations[0].lat),
//       longitude: parseFloat(locations[0].lon)
//     };
//   } catch (error: any) {
//     console.error('Error fetching from OpenStreetMap API:', error.message);
//     throw error;
//   }
// };

// // Detect if a postcode is in Central London
// export const isCentralLondonPostcode = (postcode: string): boolean => {
//   const centralPrefixes = ['EC1', 'EC2', 'EC3', 'EC4', 'W1', 'WC1', 'WC2', 'SW1', 'SE1', 'NW1'];
//   return centralPrefixes.some(prefix =>
//     postcode.replace(/\s+/g, '').toUpperCase().startsWith(prefix)
//   );
// };

// // Get real road distance using Google Maps Distance Matrix API
// export const getDrivingDistance = async (
//   origin: string,
//   destination: string
// ): Promise<{ distanceInMiles: number; durationInMinutes: number }> => {
//   const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDKh_wbcDcAMUeu-V9luJrVODl2CzJt6lQ";
//   const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

//   const response = await axios.get(url);
//   const data = response.data;

//   if (
//     data.status !== "OK" ||
//     !data.rows[0] ||
//     data.rows[0].elements[0].status !== "OK"
//   ) {
//     throw new Error("Unable to retrieve driving distance");
//   }

//   const element = data.rows[0].elements[0];
//   return {
//     distanceInMiles: +(element.distance.value / 1609.34).toFixed(3),
//     durationInMinutes: +(element.duration.value / 60).toFixed(2)
//   };
// };

// // MAIN LOGIC - returns total price and total distance
// export const calculateRunCourierPrice2 = async (
//   input: DeliveryRequestInput
// ): Promise<{ totalPrice: number; totalDistance: number }> => {
//   const {
//     service,
//     pickup,
//     delivery,
//     country,
//     weight,
//     time,
//     waitingTime = 0,
//     returnTrip = false,
//     returnToSameLocation = true
//   } = input;

//   const totalWeight = typeof weight === "string" ? parseFloat(weight) : weight;
//   const parsedWaitTime = typeof waitingTime === "string" ? parseFloat(waitingTime) : waitingTime;

//   const vehiclePricing = {
//     motorbike: { base: 5, rate: 1.30, rushRate: 1.50, maxWeight: 5 },
//     car: { base: 25, rate: 1.20, rushRate: 1.40, maxWeight: 50 },
//     smallVan: { base: 25, rate: 1.30, rushRate: 1.60, maxWeight: 400 },
//     mediumVan: { base: 25, rate: 1.40, rushRate: 1.70, maxWeight: 750 }
//   };

//   if (service === "motorbike" && totalWeight > 50) {
//     throw new ApiError(
//       httpStatus.NOT_ACCEPTABLE,
//       "Motorbike service does not support deliveries over 50kg. Please choose a different vehicle type."
//     );
//   }

//   // Detect if pickup is inside London
//   const pickupPostcode = pickup.split(" ")[0]; // Assuming first part is the postcode
//   const isPickupInLondon = isCentralLondonPostcode(pickupPostcode);
// console.log({isPickupInLondon});
//   // Set the correct base charge based on pickup location
//   let baseCharge = vehiclePricing[service].base;
//   if (isPickupInLondon) {
//     if (service === "car") baseCharge = 30;
//     if (service === "smallVan") baseCharge = 35;
//     if (service === "mediumVan") baseCharge = 40;
//   } else {
//     if (service === "car" || service === "smallVan" || service === "mediumVan") baseCharge = 25;
//   }

//   const getRate = (v: VehicleType, totalMinutes: number) => {
//     const isRushHour =
//       (totalMinutes >= 420 && totalMinutes < 600) ||
//       (totalMinutes >= 960 && totalMinutes < 1140);

//     const pricing = vehiclePricing[v];
//     if (!pricing) throw new Error(`Invalid vehicle type: ${v}`);
//     return isRushHour ? pricing.rushRate : pricing.rate;
//   };

//   const parseTimeToMinutes = (timeStr: string): number => {
//     const [h, m] = timeStr.split(":").map(Number);
//     return h * 60 + m;
//   };

//   const getWeightSurcharge = (weight: number): number => {
//     if (weight <= 10) return 0;
//     if (weight <= 20) return 10;
//     if (weight <= 30) return 20;
//     if (weight <= 40) return 30;
//     if (weight <= 50) return 40;
//     return 40;
//   };

//   let totalPrice = 0;
//   let totalDistance = 0;

//   const bookingMinutes = parseTimeToMinutes(time);
//   const rate = getRate(service, bookingMinutes);
//   const pricing = vehiclePricing[service];
//   console.log({service});

//   let lastAddress = pickup;
//   const allPostcodes = [pickup, ...delivery, ...(returnTrip ? [pickup] : [])];
//   const centralFlags = allPostcodes.map(p => isCentralLondonPostcode(p));

//   for (let i = 0; i < delivery.length; i++) {
//     const dropAddress = delivery[i];
//     const { distanceInMiles } = await getDrivingDistance(
//       lastAddress + " " + country,
//       dropAddress + " " + country
//     );

//     totalDistance += distanceInMiles;
// console.log({baseCharge});
//     let legPrice = i === 0 ? baseCharge : 5; // Apply base charge only on the first drop
//     legPrice += distanceInMiles * rate;
//     legPrice += getWeightSurcharge(totalWeight);

//     if (parsedWaitTime > 10) {
//       legPrice += (parsedWaitTime - 10) * 0.5;
//     }

//     if (centralFlags[i + 1]) legPrice += 15;

//     totalPrice += legPrice;
//     lastAddress = dropAddress;
//   }

//   // Handle Return Trip
//   if (returnTrip) {
//     const { distanceInMiles: returnMiles } = await getDrivingDistance(
//       lastAddress + " " + country,
//       pickup + " " + country
//     );

//     totalDistance += returnMiles;

//     let returnPrice = returnMiles * rate * (returnToSameLocation ? 0.75 : 1);
//     returnPrice += getWeightSurcharge(totalWeight);

//     if (parsedWaitTime > 10) {
//       returnPrice += (parsedWaitTime - 10) * 0.5;
//     }

//     if (!returnToSameLocation && centralFlags[delivery.length + 1]) {
//       returnPrice += 15;
//     }

//     totalPrice += returnPrice;
//   }

//   return {
//     totalPrice: +totalPrice.toFixed(2),
//     totalDistance: +totalDistance.toFixed(2),
//   };
// };




import httpStatus from "http-status";
import ApiError from "../errors/ApiErrors";
import axios from "axios";

export type VehicleType = "motorbike" | "car" | "smallVan" | "mediumVan";

export interface DeliveryRequestInput {
  service: VehicleType;
  pickup: string;
  delivery: string[];
  country: string;
  weight: number | string;
  time: string;
  waitingTime?: number | string;
  returnTrip?: boolean;
  returnToSameLocation?: boolean;
}

export const isCentralLondonPostcode = (postcode: string): boolean => {
  const centralPrefixes = ['EC1', 'EC2', 'EC3', 'EC4', 'W1', 'WC1', 'WC2', 'SW1', 'SE1', 'NW1'];
  return centralPrefixes.some(prefix =>
    postcode.replace(/\s+/g, '').toUpperCase().startsWith(prefix)
  );
};

export const getDrivingDistance = async (
  origin: string,
  destination: string
): Promise<{ distanceInMiles: number; durationInMinutes: number }> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDKh_wbcDcAMUeu-V9luJrVODl2CzJt6lQ";
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

  const response = await axios.get(url);
  const data = response.data;

  if (
    data.status !== "OK" ||
    !data.rows[0] ||
    data.rows[0].elements[0].status !== "OK"
  ) {
    throw new Error("Unable to retrieve driving distance");
  }

  const element = data.rows[0].elements[0];
  return {
    distanceInMiles: +(element.distance.value / 1609.34).toFixed(3),
    durationInMinutes: +(element.duration.value / 60).toFixed(2)
  };
};

// export const calculateRunCourierPrice2 = async (
//   input: DeliveryRequestInput
// ): Promise<{ totalPrice: number; totalDistance: number }> => {
//   let {
//     service,
//     pickup,
//     delivery,
//     country,
//     weight,
//     time,
//     waitingTime = 0,
//     returnTrip = false,
//     returnToSameLocation = true
//   } = input;

//   const totalWeight = typeof weight === "string" ? parseFloat(weight) : weight;
//   const parsedWaitTime = typeof waitingTime === "string" ? parseFloat(waitingTime) : waitingTime;

//   const vehiclePricing = {
//     motorbike: { base: 5, rate: 1.30, rushRate: 1.50, maxWeight: 5 },
//     car: { base: 25, rate: 1.20, rushRate: 1.40, maxWeight: 50 },
//     smallVan: { base: 25, rate: 1.30, rushRate: 1.60, maxWeight: 400 },
//     mediumVan: { base: 25, rate: 1.40, rushRate: 1.70, maxWeight: 750 }
//   };

//   if (service === "motorbike" && totalWeight > 50) {
//     throw new ApiError(
//       httpStatus.NOT_ACCEPTABLE,
//       "Motorbike service does not support deliveries over 50kg. Please choose a different vehicle type."
//     );
//   }

//   const pickupPostcode = pickup.split(" ")[0];
//   const isPickupInLondon = isCentralLondonPostcode(pickupPostcode);

//   let baseCharge = vehiclePricing[service].base;
//   if (isPickupInLondon) {
//     if (service === "car") baseCharge = 30;
//     if (service === "smallVan") baseCharge = 35;
//     if (service === "mediumVan") baseCharge = 40;
//   }

//   const getRate = (v: VehicleType, totalMinutes: number) => {
//     const isRushHour =
//       (totalMinutes >= 420 && totalMinutes < 600) ||
//       (totalMinutes >= 960 && totalMinutes < 1140);

//     const pricing = vehiclePricing[v];
//     if (!pricing) throw new Error(`Invalid vehicle type: ${v}`);
//     return isRushHour ? pricing.rushRate : pricing.rate;
//   };

//   const parseTimeToMinutes = (timeStr: string): number => {
//     const [h, m] = timeStr.split(":").map(Number);
//     return h * 60 + m;
//   };

//   const getWeightSurcharge = (weight: number): number => {
//     if (weight <= 10) return 0;
//     if (weight <= 20) return 10;
//     if (weight <= 30) return 20;
//     if (weight <= 40) return 30;
//     if (weight <= 50) return 40;
//     return 40;
//   };

//   let totalPrice = 0;
//   let totalDistance = 0;

//   const bookingMinutes = parseTimeToMinutes(time);
//   const rate = getRate(service, bookingMinutes);
//   const pricing = vehiclePricing[service];

//   let lastAddress = pickup;
//   const allPostcodes = [pickup, ...delivery, ...(returnTrip ? [pickup] : [])];
//   const centralFlags = allPostcodes.map(p => isCentralLondonPostcode(p));

//   const legDistances: number[] = [];

//   for (let i = 0; i < delivery.length; i++) {
//     const dropAddress = delivery[i];
//     const { distanceInMiles } = await getDrivingDistance(
//       lastAddress + " " + country,
//       dropAddress + " " + country
//     );

//     legDistances.push(distanceInMiles);
//     totalDistance += distanceInMiles;

//     let legPrice = i === 0 ? baseCharge : 5;
//     legPrice += distanceInMiles * rate;
//     legPrice += getWeightSurcharge(totalWeight);

//     if (parsedWaitTime > 10) {
//       legPrice += (parsedWaitTime - 10) * 0.5;
//     }

//     if (centralFlags[i + 1]) legPrice += 15;

//     totalPrice += legPrice;
//     lastAddress = dropAddress;
//   }

//   console.log({isPickupInLondon});
//   // 🚗 Auto-upgrade to car if total distance exceeds 10 miles
//   if (service === "motorbike" && totalDistance > 10) {
//     console.warn(`Distance ${totalDistance}mi exceeds motorbike limit. Switching to car.`);
//     service = "car";

//     const newPricing = vehiclePricing[service];
//     const newRate = getRate(service, bookingMinutes);
//     baseCharge = isPickupInLondon ? 30 : newPricing.base;

//     totalPrice = 0;
//     lastAddress = pickup;

//     for (let i = 0; i < delivery.length; i++) {
//       const dropAddress = delivery[i];
//       const distanceInMiles = legDistances[i];

//       let legPrice = i === 0 ? baseCharge : 5;
//       legPrice += distanceInMiles * newRate;
//       legPrice += getWeightSurcharge(totalWeight);

//       if (parsedWaitTime > 10) {
//         legPrice += (parsedWaitTime - 10) * 0.5;
//       }

//       if (centralFlags[i + 1]) legPrice += 15;

//       totalPrice += legPrice;
//       lastAddress = dropAddress;
//     }
//   }

//   console.log({baseCharge});
//   // Return trip logic
//   if (returnTrip) {
//     const { distanceInMiles: returnMiles } = await getDrivingDistance(
//       lastAddress + " " + country,
//       pickup + " " + country
//     );

//     totalDistance += returnMiles;

//     const finalRate = getRate(service, bookingMinutes);
//     let returnPrice = returnMiles * finalRate * (returnToSameLocation ? 0.75 : 1);
//     returnPrice += getWeightSurcharge(totalWeight);

//     if (parsedWaitTime > 10) {
//       returnPrice += (parsedWaitTime - 10) * 0.5;
//     }

//     if (!returnToSameLocation && centralFlags[delivery.length + 1]) {
//       returnPrice += 15;
//     }

//     totalPrice += returnPrice;
//   }
// console.log({totalDistance} );
//   return {
//     totalPrice: +totalPrice.toFixed(2),
//     totalDistance: +totalDistance.toFixed(2),
//   };
// };












export const calculateRunCourierPrice2 = async (
 input: DeliveryRequestInput
): Promise<{ totalPrice: number; totalDistance: number }> => {
 let {
 service,
 pickup,
 delivery,
 country,
 weight,
 time,
 waitingTime = 0,
 returnTrip = false,
 returnToSameLocation = true
 } = input;
 const kg = typeof weight === "string" ? parseFloat(weight) : weight;
 const waitTotal = typeof waitingTime === "string" ? parseFloat(waitingTime) : waitingTime;
 const PR = {
 motorbike: { base: 5, rate: 1.20, rush: 1.50, maxKg: 10, maxMiles: 10 },
 car: { base: 30, rate: 1.20, rush: 1.70, maxKg: 50 },
 smallVan: { base: 35, rate: 1.30, rush: 1.80, maxKg: 400 },
 mediumVan: { base: 40, rate: 1.40, rush: 1.90, maxKg: 750 },
 ccz: { fee: 17, startMin: 6*60, endMin: 18*60 },
 extraStopFee: 3
 } as const;
 const RUSH_WINDOWS: Array<[number, number]> = [
 [7*60, 10*60],
 [16*60, 19*60],
 ];
 const toMinutes = (hhmm: string) => {
 const [h, m] = hhmm.split(":").map(Number);
 return h * 60 + (m || 0);
 };
 const tMin = toMinutes(time);
 const isRush = RUSH_WINDOWS.some(([a,b]) => tMin >= a && tMin < b);
 const inCCZWindow = (tMin >= PR.ccz.startMin && tMin < PR.ccz.endMin);
 const weightSurcharge = (v: VehicleType, w: number): number => {
 if (v === "motorbike") return 0;
 if (w <= 10) return 0;
 if (w <= 20) return 10;
 if (w <= 30) return 15;
 if (w <= 50) return 20;
 return 30;
 };
 const rateFor = (v: VehicleType) => (isRush ? PR[v].rush : PR[v].rate);
 let totalDistance = 0;
 let last = pickup;
 const legMiles: number[] = [];
 for (let i = 0; i < delivery.length; i++) {
 const next = delivery[i];
 const { distanceInMiles } = await getDrivingDistance(`${last} ${country}`, `${next} ${country}`);
 legMiles.push(distanceInMiles);
 totalDistance += distanceInMiles;
 last = next;
 }
 if (service === "motorbike") {
 if (kg > PR.motorbike.maxKg || totalDistance > PR.motorbike.maxMiles) {
 service = "car";
 }
 }
 const veh = PR[service];
 const perMile = rateFor(service);
 let priceFirstJob = 0;
 priceFirstJob += veh.base;
 priceFirstJob += legMiles.reduce((sum, mi) => sum + mi * perMile, 0);
 const extraStops = Math.max(0, (delivery.length - 1)) * PR.extraStopFee;
 priceFirstJob += extraStops;
 priceFirstJob += weightSurcharge(service, kg);
 const anyCCZ = ([pickup, ...delivery]).some(addr =>
 isCentralLondonPostcode(addr.split(" ")[0])
 );
 if (anyCCZ && inCCZWindow) {
 priceFirstJob += PR.ccz.fee;
 }
 const FREE_WAIT_TOTAL = 20;
 if (waitTotal > FREE_WAIT_TOTAL) {
 priceFirstJob += (waitTotal - FREE_WAIT_TOTAL) * 0.5;
 }
 let totalPrice = priceFirstJob;
 if (returnTrip) {
 if (returnToSameLocation) {
 totalPrice += +(priceFirstJob * 0.60).toFixed(2);
 } else {
 const { distanceInMiles: retMi } = await getDrivingDistance(`${last} ${country}`, `${pickup} ${country}`);
 totalDistance += retMi;
 let secondJob = 0;
 secondJob += veh.base;
 secondJob += retMi * perMile;
 const returnCCZ = ([last, pickup]).some(addr =>
 isCentralLondonPostcode(addr.split(" ")[0])
 );
 if (returnCCZ && inCCZWindow) secondJob += PR.ccz.fee;
 secondJob += weightSurcharge(service, kg);
 totalPrice += +secondJob.toFixed(2);
 }
 }
 return {
 totalPrice: +totalPrice.toFixed(2),
 totalDistance: +totalDistance.toFixed(2)
 };
}