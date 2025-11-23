import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import emailSender2 from "../../../shared/emailSender2";
import { generateDeliveryInfoHtml } from "../../../shared/generateDeliveryInfoHtml";
import prisma from "../../../shared/prisma";
import emailSender from "../../../shared/emailSender";
import {
  ParcelStatus,
  Prisma,
  RiderRequest,
  RiderRequestStatus,
  UserRole,
  whereHouseRequestStatus,
} from "@prisma/client";
import { getLatLngFromPostalCode } from "../../../shared/getLatLong";
import { parcelTrackings } from "../../../shared/parcelTrack";
import { parcelSearchAbleFields } from "./DeliveeryInfo.constant";
import { sendSingleNotificationUtils } from "../Notification/Notification.service";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const createIntoDb = async (data: any) => {
  const { recipients, ...rest } = data;

  const transaction = await prisma.$transaction(async (prisma) => {
    const deliveryInfo = await prisma.parcel.create({
      data: rest,
    });

    if (recipients?.length > 0) {
      await Promise.all(
        recipients.map((recipient: any) =>
          prisma.recipient.create({
            data: {
              ...recipient,
              deliveryInfoId: deliveryInfo.id,
            },
          })
        )
      );
    }else{
      throw new ApiError(httpStatus.NOT_FOUND,"must you need to add recipients")
    }

    return deliveryInfo;
  });

  // Notify admin about the new order (best-effort, do not block)
  try {
    const admin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    if (admin) {
      await sendSingleNotificationUtils({
        userId: admin.id,
        senderId: transaction.userId || (rest as any).userId,
        title: "New Order Created",
        body: `New order ${transaction.id} was created by user ${transaction.userId || (rest as any).userId}`,
      });
    }
  } catch (err: any) {
    console.error('Failed to send admin notification for new order:', err?.message || err);
  }

  return transaction;
};

const getListFromDb = async (filters: any) => {
  const { searchTerm, isApproved, ...filterData } = filters;
  const andConditions: Prisma.ParcelWhereInput[] = [];
  if (filterData.searchTerm) {
    andConditions.push({
      OR: parcelSearchAbleFields.map((field) => ({
        [field]: {
          contains: filters.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }
  const whereConditions: Prisma.ParcelWhereInput = { AND: andConditions };
  const result = await prisma.parcel.findMany({
    where: whereConditions,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      pickupName: true,
      pickupMobile: true,
      pickupEmail: true,
      pickupPostCode: true,
      pickupAddress: true,
      productPrice: true,
      deliveryCharge: true,
      preferredCollectionDate: true,
      avgCollectionTime: true,
      toavgCollectionTime: true,
      avgDeliveryTime: true,
      toAvgDeliveryTime: true,
      packageWeight: true,
      serviceType: true,
      packageContent: true,
      specialInstruction: true,
      isPayment: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {
  // parcelTrackings(id,"you parcel is sending by driver")
  const result = await prisma.parcel.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      pickupName: true,
      pickupMobile: true,
      pickupAddress: true,
      status: true,
      pickupEmail: true,
      pickupPostCode: true,
      productPrice: true,
      deliveryCharge: true,
      recipients: {
        select: {
          id: true,
          recipientName: true,
          recipientMobile: true,
          recipientEmail: true,
          recipientAddress: true,
          recipientPostCode: true,
        },
      },

      riderRequest: {
        where: { status: RiderRequestStatus.ACCEPTED },
        select: {
          id: true,
          deliveryCharge: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          rider: {
            select: {
              id: true,
              email: true,
              fullName: true,
              profileImage: true,
              phoneNumber: true,
            },
          },
        },
      },
      provOfDelivery: {
        select: {
          id: true,
          parcelId: true,
          proveImage: true,
          signature: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      parcelTrack: {
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
    },
  });
  if (!result) {
    throw new Error("deliveryInfo not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.parcel.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.parcel.delete({
      where: { id },
    });

    return deletedItem;
  });

  return transaction;
};
const payment = async (userId: string, body: any) => {
  const { amount } = body;

  const userExist = await prisma.user.findFirst({ where: { id: userId } });
  if (!userExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not Found");
  }
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "gbp",
    receipt_email: userExist.email,
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    intent: paymentIntent.id,
  };
};

const createPaymentInfo = async (payload: any) => {
  console.log("createPaymentInfo");
  const isExistOrder = await prisma.parcel.findFirst({
    where: { id: payload.orderId },
    include: { recipients: true },
  });
  if (!isExistOrder) {
    throw new ApiError(httpStatus.NOT_FOUND, " Order not found");
  }
  const data = {
    userId: payload.userId,
    orderId: payload.orderId,
    paymentInt: payload.paymentInt,
    amount: payload.amount,
    distance: payload.distance ?? isExistOrder.distance,
    isReturnTrip: payload.isReturnTrip,
  };
  const result = await prisma.paymentInfo.create({ data: data });
  const html = generateDeliveryInfoHtml(
    isExistOrder,
    payload.amount,
    "Your Delivery Summary",
    data.isReturnTrip,
    String(isExistOrder.distance||payload.distance)
  );
  // ADMIN EMAIL
  await emailSender(
    isExistOrder.pickupEmail,
    html,
    "YOU GOT ANOTHER ORDER FROM RUN-COURIER"
  );
  // user email
  const htmlForUser = generateDeliveryInfoHtml(
    isExistOrder,
    payload.amount,
    "Your Delivery Summary",
    payload.isReturnTrip
  );
  console.log(isExistOrder.pickupEmail);
  await emailSender2(
    isExistOrder.pickupEmail,
    htmlForUser,
    "Your Delivery Invoice"
  );
  
  // return result;
};

const getRideRequestBasedOnRider = async (riderId: string, query: any) => {
  const baseQuery: any = {
    riderId,
  };
  const roleBaseQuery: any = {};
  if (query.status) {
    if (
      !Object.values(RiderRequestStatus).includes(
        query.status.toUpperCase() as RiderRequestStatus
      )
    ) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status");
    }
    baseQuery["status"] = query.status.toUpperCase() as RiderRequestStatus;
  }

  if (query.role) {
    if (
      !Object.values(UserRole).includes(query.role.toUpperCase() as UserRole)
    ) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid role");
    }
    roleBaseQuery["role"] = query.role.toUpperCase() as UserRole;
  }
  const riderProfile = await prisma.riderRequest.findMany({
    where: {
      ...baseQuery,
      assigner: roleBaseQuery,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      deliveryCharge: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      parcel: {
        select: {
          id: true,
          pickupAddress: true,
          pickupEmail: true,
          userId: true,
        },
      },
      rider: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
        },
      },
      assigner: {
        select: {
          id: true,
          email: true,
          fullName: true,
          profileImage: true,
          role: true,
        },
      },
    },
  });
  return riderProfile;
};

const acceptRideRequestByDriver = async (requestId: string) => {
  const request = await prisma.riderRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ride request not found");
  }

  if (request.status !== RiderRequestStatus.PENDING) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Ride request is not pending");
  }

  await prisma.riderRequest.deleteMany({
    where: {
      parcelId: request.parcelId,
      NOT: { id: requestId },
      status: RiderRequestStatus.PENDING,
    },
  });

  const updatedRequest = await prisma.riderRequest.update({
    where: { id: requestId },
    data: { status: RiderRequestStatus.ACCEPTED },
  });

  return updatedRequest;
};
const rejectRideRequestByDriver = async (
  requestId: string,
  rejectionReason: string
) => {
  const adminReq = await prisma.riderRequest.findUnique({
    where: { id: requestId },
  });
  const whereHouseRequest = await prisma.whereHouseRequest.findUnique({
    where: { id: requestId },
  });
  if (adminReq) {
    if (adminReq.status !== RiderRequestStatus.PENDING) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Ride request is not pending");
    }
    const updatedRequest = await prisma.riderRequest.update({
      where: { id: requestId },
      data: {
        status: RiderRequestStatus.REJECTED,
        rejectionReason: rejectionReason || "No reason provided",
      },
    });
    return updatedRequest;
  } else if (whereHouseRequest) {
    if (whereHouseRequest.status !== RiderRequestStatus.PENDING) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Ride request is not pending");
    }
    const updatedRequest = await prisma.whereHouseRequest.update({
      where: { id: requestId },
      data: {
        status: whereHouseRequestStatus.REJECTED,
        rejectionReason: rejectionReason || "No reason provided",
      },
    });
    return updatedRequest;
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Ride request not found");
  }
};

const getParcelLocationWithRider = async (parcelId: string, userId: string) => {
  const existUser = await prisma.driverProfile.findUnique({
    where: { userId },
    
  });
  if (!existUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
  
    select: {
      id: true,
      pickupAddress: true,
      pickupEmail: true,
      pickupPostCode: true,
      recipients: {
        select: {
          id: true,
          recipientName: true,
          recipientAddress: true,
          recipientPostCode: true,
        },
      },
    },
  });
  if (!parcel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Parcel not found");
  }

  // console.log("parcel", parcel.pickupPostCode);
  const pickupLatLng = await getLatLngFromPostalCode(
    parcel.pickupPostCode,
    "UK"
  );
  const recipientLatLngPromises = parcel.recipients.map((recipient) =>
    getLatLngFromPostalCode(recipient.recipientPostCode, "UK")
  );
  const recipientLatLngs = await Promise.all(recipientLatLngPromises);
  // return {
  //   pickupLocation: {
  //     address: parcel.pickupAddress,
  //     postCode: parcel.pickupPostCode,
  //     ...await pickupLatLng
  //   },
  //  recepientLatLong:recipientLatLngs

  // }
  return {
    user: { longitude: existUser.longitude, latitude: existUser.latitude },
    pickupLatLng,
    recipientLatLngs,
  };
};

const completeDelivery = async (parcelId: string) => {
  const isExistParcel = await prisma.parcel.findFirst({
    where: {
      id: parcelId,
    },
  });

  if (!isExistParcel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Parcel not found");
  }
  const parcelSender = await prisma.user.findFirst({
    where: { id: isExistParcel?.userId },
    select: {
      id: true,
      role: true,
    },
  });
  if (!parcelSender) {
    throw new ApiError(httpStatus.NOT_FOUND, "Parcel sender not found");
  }

  if (parcelSender?.role === UserRole.MERCHANT) {
    const profile = await prisma.merchant.findFirst({
      where: { userId: parcelSender.id },
    });
    if (!profile) {
      throw new ApiError(httpStatus.NOT_FOUND, "merchent profile not found ");
    }
    await prisma.merchant.update({
      where: { id: profile.id },
      data: { amount: profile.amount + isExistParcel.productPrice },
    });
  }

  const updateParcel = await prisma.parcel.update({
    where: { id: parcelId },
    data: { status: ParcelStatus.DELIVERED },
  });
  const riderRequest = await prisma.riderRequest.findFirst({
    where: { parcelId },
  });
  if (riderRequest) {
    await prisma.riderRequest.update({
      where: { id: riderRequest.id },
      data: { status: RiderRequestStatus.DELIVERED },
    });
  }
  const whereHouse = await prisma.whereHouseRequest.findFirst({
    where: { parcelId },
  });
  if (whereHouse) {
    await prisma.whereHouseRequest.update({
      where: { id: whereHouse.id },
      data: { status: whereHouseRequestStatus.DELIVERED },
    });
  }
  return updateParcel;
};

const getAllTrackingListByParcel = async (parcelId: string) => {
  if (!parcelId) {
    throw new ApiError(httpStatus.NOT_FOUND, "parcel id not found");
  }
  const parcel = await prisma.parcel.findFirst({
    where: { id: parcelId },
    select: {
      pickupName: true,
    },
  });
  const result = await prisma.parcelTrack.findMany({
    where: { orderId: parcelId },
  });
  return { ...parcel, result };
};

const getSingleRideRequest = async (requestId: string) => {
  const result = await prisma.riderRequest.findFirst({
    where: { id: requestId },
    select: {
      id: true,
      riderId: true,
      parcel: {
        select: {
          id: true,
          userId: true,
          pickupName: true,
          pickupMobile: true,
          pickupAddress: true,
          status: true,
          pickupEmail: true,
          pickupPostCode: true,
          productPrice: true,
          deliveryCharge: true,
          recipients: {
            select: {
              id: true,
              recipientName: true,
              recipientMobile: true,
              recipientEmail: true,
              recipientAddress: true,
              recipientPostCode: true,
            },
          },

          riderRequest: {
            where: { status: RiderRequestStatus.ACCEPTED },
            select: {
              id: true,
              deliveryCharge: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              rider: {
                select: {
                  id: true,
                  email: true,
                  fullName: true,
                  profileImage: true,
                  phoneNumber: true,
                },
              },
            },
          },
          provOfDelivery: {
            select: {
              id: true,
              parcelId: true,
              proveImage: true,
              signature: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          parcelTrack: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
  return result;
};
const searchParcel = async (parcelId: string, userId: string) => {
  const isExitUserParcel = await prisma.userParcel.findFirst({
    where: { parcelId, userId },
  });
  if (!isExitUserParcel) {
    await prisma.userParcel.create({
      data: { parcelId, userId },
    });
  }
  const userParcel = await prisma.parcel.findFirst({
    where: { id: parcelId },
    select: {
      id: true,
      pickupName: true,
      pickupMobile: true,
      pickupAddress: true,
      status: true,
      pickupEmail: true,
      pickupPostCode: true,
      productPrice: true,
      deliveryCharge: true,
      recipients: {
        select: {
          id: true,
          recipientName: true,
          recipientMobile: true,
          recipientEmail: true,
          recipientAddress: true,
          recipientPostCode: true,
        },
      },

      riderRequest: {
        where: { status: RiderRequestStatus.ACCEPTED },
        select: {
          id: true,
          deliveryCharge: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          rider: {
            select: {
              id: true,
              email: true,
              fullName: true,
              profileImage: true,
              phoneNumber: true,
            },
          },
        },
      },
      provOfDelivery: {
        select: {
          id: true,
          parcelId: true,
          proveImage: true,
          signature: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      parcelTrack: {
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
    },
  });
  return userParcel;
};
const getUserBaseParcel = async (userId: string) => {
  const userParcels = await prisma.userParcel.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      parcelId: true,
    },
  });
  const parcelIds = userParcels.map((parcel) => parcel.parcelId);
  const result = await prisma.parcel.findMany({
    where: { id: { in: parcelIds } },
    select: {
      id: true,
      userId: true,
      pickupName: true,
      pickupMobile: true,
      pickupEmail: true,
      pickupPostCode: true,
      pickupAddress: true,
      productPrice: true,
      deliveryCharge: true,
      preferredCollectionDate: true,
      avgCollectionTime: true,
      toavgCollectionTime: true,
      avgDeliveryTime: true,
      toAvgDeliveryTime: true,
      packageWeight: true,
      serviceType: true,
      packageContent: true,
      specialInstruction: true,
      isPayment: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};
// update driver location
const updateDriverLocation = async (
  userId: string,
  latitude: number,
  longitude: number
) => {
  const existUser = await prisma.driverProfile.findUnique({
    where: { userId },
  });
  if (!existUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const updatedLocation = await prisma.driverProfile.update({
    where: { userId },
    data: { latitude:String(latitude), longitude:String(longitude) },
    select:{
      id:true,
      userId:true,
      latitude:true,
      longitude:true,
      updatedAt:true,
    }
  });
  return updatedLocation;
};

export const deliveryInfoService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  payment,
  createPaymentInfo,
  getRideRequestBasedOnRider,
  acceptRideRequestByDriver,
  rejectRideRequestByDriver,
  getParcelLocationWithRider,
  completeDelivery,
  getAllTrackingListByParcel,
  getSingleRideRequest,
  searchParcel,
  getUserBaseParcel,
  updateDriverLocation,
};
