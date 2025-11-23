import { ParcelStatus, RiderRequestStatus, UserRole } from "@prisma/client";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { getLatLngFromPostalCode } from "../../../shared/getLatLong";
import { haversineDistance } from "../../../shared/haverSineDistance";
import { Pricing } from "aws-sdk";
import { sendSingleNotificationUtils } from "../Notification/Notification.service";

const createIntoDb = async () => {};

const getListFromDb = async () => {};

const getByIdFromDb = async (id: string) => {};

const updateIntoDb = async (id: string, data: any) => {};

const deleteItemFromDb = async (id: string) => {};
const getAllCount = async () => {
  const [user, merchant, deliveryPerson, wareHouse, reviewedParcel] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: UserRole.USER },
        select: { id: true, profileImage: true },
      }),
      prisma.user.findMany({
        where: { role: UserRole.MERCHANT },
        select: { id: true, profileImage: true },
      }),
      prisma.user.findMany({
        where: { role: UserRole.DELIVERYPERSON },
        select: { id: true, profileImage: true },
      }),
      prisma.user.findMany({ where: { role: UserRole.WAREHOUSE } }),
      prisma.parcel.findMany({
        where: { status: ParcelStatus.REVIEW },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              profileImage: true,
            },
          },
        },
      }),
    ]);
  return { user, merchant, deliveryPerson, wareHouse, reviewedParcel };
};

const getAllNewRequest = async () => {
  const result = await prisma.parcel.findMany({
    where: {
      status: ParcelStatus.REVIEW,
    },
    select: {
      id: true,
      userId: true,
      pickupName: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
    },
  });
  return result;
};

const confirmParcel = async (parcelId: string) => {
  const isExits = await prisma.parcel.findFirst({ where: { id: parcelId } });
  if (!isExits) {
    throw new ApiError(httpStatus.NOT_FOUND, "request not found");
  }

  if (isExits.status !== ParcelStatus.REVIEW) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "You are unable to accept this parcel as its status is not in the 'Review' stage."
    );
  }

  const result = await prisma.parcel.update({
    where: { id: parcelId },
    data: { status: ParcelStatus.PENDING },
    select: { id: true, status: true },
  });
  return result;
};

const cancelParcel = async (requestId: string) => {
  const isExits = await prisma.parcel.findFirst({ where: { id: requestId } });
  if (!isExits) {
    throw new ApiError(httpStatus.NOT_FOUND, "request not found");
  }
  if (isExits.status !== ParcelStatus.REVIEW) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "You are unable to reject this parcel as its status is not in the 'Review' stage."
    );
  }
  const result = await prisma.parcel.update({
    where: { id: requestId },
    data: { status: ParcelStatus.REJECTED },
    select: { id: true, status: true },
  });
  return result;
};
//TODO: Implement findRiderBaseParcelLocations search by userId and pickupPostCode

const findRiderBaseParcelLocations = async (parcelId: string) => {
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    select: {
      id: true,
      pickupPostCode: true,
    },
  });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Parcel not found");
  }
  const { latitude, longitude } = await getLatLngFromPostalCode(
    parcel.pickupPostCode,
    "UK"
  );
  // TODO
  const riderProfile = await prisma.driverProfile.findMany({
    where: {
      latitude: { not: "" },
      longitude: { not:"" },
      // user: {
      //   isApproved: true,
      // },
    },
    select: {
      id: true,
      longitude: true,
      latitude: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });
  if (!riderProfile) {
    throw new ApiError(httpStatus.NOT_FOUND, "Rider profile not found");
  }

  // const nearbyRiders = riderProfile.filter((rider) => {
  //   const distance = haversineDistance(
  //     latitude,
  //     longitude,
  //     rider.latitude,
  //     rider.longitude
  //   );
  //   // return distance <= 10;
  //   return distance;
  // });

  return riderProfile;
};

const SendRiderRequest = async (payload: any) => {
  const { riderId, parcelId, deliveryCharge, assignId } = payload;

  if (!assignId) {
    throw new ApiError(httpStatus.NOT_FOUND, "assigner id not found");
  }
  const userExist = await prisma.user.findFirst({ where: { id: riderId } });
  if (!userExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not Found");
  }

  const parcelExist = await prisma.parcel.findFirst({
    where: { id: parcelId },
  });
  if (!parcelExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Parcel not Found");
  }
  // console.log(riderId, parcelId, deliveryCharge);
 await sendSingleNotificationUtils({
    userId: riderId,
    senderId: assignId,
    title: "New ride request",
    body: "You have new ride request",
  });

  const riderRequest = await prisma.riderRequest.create({
    data: {
      assignId,
      riderId,
      parcelId,
      deliveryCharge,
    },
  });

  return riderRequest;
};

const rideRequestAccept = async (requestId: string) => {
  console.log("rideRequestAccept", requestId);
};

const getAllPendingRideRequests = async () => {
  const result = await prisma.riderRequest.findMany({
    where: { status: RiderRequestStatus.PENDING },
    select: {
      id: true,
      deliveryCharge: true,
      status: true,
      rider: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
        },
      },
      parcel: {
        select: {
          id: true,
          pickupName: true,
          pickupPostCode: true,
        },
      },
    },
  });
  return result;
};
const getAllAcceptedRideRequests = async () => {
  const result = await prisma.riderRequest.findMany({
    where: { status: RiderRequestStatus.ACCEPTED },
    select: {
      id: true,
      deliveryCharge: true,
      status: true,
      rider: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
        },
      },
      parcel: {
        select: {
          id: true,
          pickupName: true,
          pickupPostCode: true,
        },
      },
    },
  });
  return result;
};
const getAllRejectedRideRequests = async () => {
  const result = await prisma.riderRequest.findMany({
    where: { status: RiderRequestStatus.REJECTED },
    select: {
      id: true,
      deliveryCharge: true,
      status: true,
      rider: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
        },
      },
      parcel: {
        select: {
          id: true,
          pickupName: true,
          pickupPostCode: true,
        },
      },
    },
  });
  return result;
};

const cancelRideRequest = async (rideRequestId: string) => {
  const isExist = await prisma.riderRequest.findFirst({
    where: { id: rideRequestId },
    select: { id: true, status: true },
  });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "not found");
  }
  if (isExist.status !== RiderRequestStatus.PENDING) {
    throw new ApiError(
      httpStatus.NOT_ACCEPTABLE,
      "Ride cannot be cancelled because it is not in pending status."
    );
  }

  const result = await prisma.riderRequest.delete({
    where: { id: rideRequestId },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "rideRequest not found");
  }
  return result;
};

const report = async () => {
  const [
    completeDelivery,
    pendingDelivery,
    topMerchant,
    driverProfile,
    deliveryCount,
    totalRevenue,
  ] = await Promise.all([
    prisma.parcel.findMany({
      where: { status: ParcelStatus.DELIVERED },
      select: {
        id: true,
        status: true,
        user: { select: { id: true, profileImage: true } },
      },
    }),
    prisma.parcel.findMany({
      where: { status: ParcelStatus.PENDING },
      select: {
        id: true,
        status: true,
        user: { select: { id: true, profileImage: true } },
      },
    }),
    prisma.merchant.findMany({
      orderBy: { amount: "desc" },
      select: {
        id: true,
        amount: true,
        user: { select: { id: true, profileImage: true } },
      },
    }),

    prisma.driverProfile.findMany({
      where: {},
      select: {
        id: true,
        user: { select: { id: true, profileImage: true } },
      },
    }),

    prisma.riderRequest.findMany({
      where: {
        status: {
          equals: RiderRequestStatus.DELIVERED,
        },
      },
    }),
    prisma.paymentInfo.aggregate({
      _sum: {
        amount: true, // Sum the 'amount' field
      },
    }),
  ]);

  const avgDelivery = driverProfile.length / deliveryCount.length;

  return {
    totalRevenue: totalRevenue._sum.amount,
    completeDelivery,
    pendingDelivery,
    topMerchant,
    avgDelivery,
  };
};
const findAllRider = async () => {
  const result = await prisma.driverProfile.findMany({
    select: {
      id: true,
      latitude: true,
      longitude: true,
      serviceType: true,
      user: {
        select: {
          id: true,
          profileImage: true,
          role: true,
          email: true,
          phoneNumber: true,
          fullName: true,
        },
      },
    },
  });
  return result;
};
export const AdminService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  getAllCount,
  getAllNewRequest,
  confirmParcel,
  cancelParcel,
  findRiderBaseParcelLocations,
  SendRiderRequest,
  rideRequestAccept,
  getAllPendingRideRequests,
  getAllAcceptedRideRequests,
  getAllRejectedRideRequests,
  cancelRideRequest,
  report,
  findAllRider,
};
