import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { IMerchantFilterRequest } from "./Merchant.interface";
import {
  paymentStatus,
  Prisma,
  UserRole,
  whereHouseRequestStatus,
} from "@prisma/client";

const createIntoDb = async (data: any) => {};

const getListFromDb = async (params: IMerchantFilterRequest) => {
  const { ...filterData } = params;
  const andConditions: Prisma.PaymentRequestWhereInput[] = [];
  if (Object.keys(filterData).length > 0) {
    Object.entries(filterData).forEach(([key, value]) => {
      if (key === "status") {
        if (
          !Object.values(paymentStatus).includes(
            value.toUpperCase() as paymentStatus
          )
        ) {
          throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status provided");
        }
        value = value.toUpperCase();
      }
      andConditions.push({ [key]: { equals: value } });
    });
  }

  const whereConditions: Prisma.PaymentRequestWhereInput = {
    AND: andConditions,
  };
  // console.dir(whereConditions,{depth:Infinity});
  const result = await prisma.paymentRequest.findMany({
    where: whereConditions,
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true, email: true } },
      status: true,
      type: true,
      cardId: true,
      bankId: true,
      amount: true,
      card: true,
      bank: true,
      createdAt: true,
    },
  });
  return result;
};

const getByIdFromDb = async (id: string) => {};

const updateIntoDb = async (id: string, data: any) => {};

const deleteItemFromDb = async (id: string) => {};
const makePaymentRequest = async (payload: any) => {
  if (!payload.userId) {
    throw new ApiError(httpStatus.NOT_FOUND, "user id not found");
  }
  const isExistUser = await prisma.user.findFirst({
    where: { id: payload.userId },
    include: { merchant: true },
  });
  if (!isExistUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "user not found");
  }
  if (payload.amount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid amount");
  }
  if (isExistUser.role !== UserRole.MERCHANT) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User is not a merchant");
  }

  const isExistMerchantProfile = await prisma.merchant.findFirst({
    where: { userId: payload.userId },
  });
  if (!isExistMerchantProfile) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "merchant profile not found.  you should to complete your profile"
    );
  }
  if (payload.amount > isExistMerchantProfile.amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Insufficient balance");
  }
  if (!payload.accountId) {
    throw new ApiError(httpStatus.NOT_FOUND, "account id not found");
  }
  const isBank = await prisma.bankInfo.findFirst({
    where: { id: payload.accountId },
  });
  const isCard = await prisma.cardInfo.findFirst({
    where: { id: payload.accountId },
  });
  if (isBank) {
    const result = await prisma.paymentRequest.create({
      data: {
        type: "bank",
        bankId: isBank.id,
        userId: payload.userId,
        amount: payload.amount,
      },
    });
    await prisma.merchant.update({
      where: { id: isExistMerchantProfile.id },
      data: { amount: isExistMerchantProfile.amount - payload.amount },
    });
    return result;
  } else if (isCard) {
    const result = await prisma.paymentRequest.create({
      data: {
        type: "card",
        cardId: isCard.id,
        userId: payload.userId,
        amount: payload.amount,
      },
    });
    await prisma.merchant.update({
      where: { id: isExistMerchantProfile.id },
      data: { amount: isExistMerchantProfile.amount - payload.amount },
    });
    return result;
  } else {
    throw new ApiError(httpStatus.NOT_FOUND, "account not found");
  }
};

const getReport = async (userId: string) => {
  const [totalRider, totalReceivedParcel, totalSendParcel, amount] =
    await Promise.all([
      prisma.user.count({
        where: { role: UserRole.DELIVERYPERSON },
      }),
      prisma.whereHouseRequest.count({
        where: {
          whereHouseId: userId,
          status: whereHouseRequestStatus.RECEIVED,
        },
      }),
      prisma.whereHouseRequest.count({
        where: {
          whereHouseId: userId,
          status: whereHouseRequestStatus.SEND,
        },
      }),

      prisma.paymentRequest.aggregate({
        where: { status: paymentStatus.COMPLETE },
        orderBy: { createdAt: "desc" },
        _sum: {
          amount: true,
        },
      }),
    ]);
  return {
    totalRider,
    totalReceivedParcel,
    totalSendParcel,
    amount: amount._sum.amount || 0,
  };
};

const getMyPaymentRequest = async (userId: string) => {
  const result = await prisma.paymentRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      user: { select: { fullName: true, email: true } },
      status: true,
      type: true,
      cardId: true,
      bankId: true,
      amount: true,
      card: true,
      bank: true,
      createdAt: true,
    },
  });
  return result;
};


/**
 * Hard-deletes a user and all related records.
 * Works with MongoDB (@db.ObjectId strings).
 */


export const MerchantService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
  makePaymentRequest,
  getMyPaymentRequest,
  getReport,

};
