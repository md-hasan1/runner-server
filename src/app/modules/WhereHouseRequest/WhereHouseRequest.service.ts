import {
  paymentStatus,
  Prisma,
  RiderRequestStatus,
  whereHouseRequestStatus,
} from "@prisma/client";
import httpStatus from "http-status";
import PDFDocument from "pdfkit";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { IWhereHouseFilterRequest } from "./WhereHouse.interface";

import Stripe from "stripe";
import { invoiceSender } from "../../../shared/invoiceSender";
import { generateInvoice } from "../../../shared/generateInvoice";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const createIntoDb = async (parcelId: string, userId: string) => {
  const existingRequest = await prisma.whereHouseRequest.findFirst({
    where: {
      parcelId,
      whereHouseId: userId,
    },
  });
  if (existingRequest) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "WhereHouseRequest already exists for this parcel and warehouse"
    );
  }
  const update = await prisma.riderRequest.updateMany({
    where: { parcelId: parcelId },
    data: { status: RiderRequestStatus.WHEREHOUSE_RECIVED },
  });
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.whereHouseRequest.create({
      data: {
        parcelId,
        whereHouseId: userId,
        status: whereHouseRequestStatus.RECEIVED,
      },
    });
    return result;
  });

  return transaction;
};

const getReceivedParcel = async (
  params: IWhereHouseFilterRequest,
  userId: string
) => {
  const andConditions: Prisma.WhereHouseRequestWhereInput[] = [
    { whereHouseId: userId },
  ];

  if (params.status) {
    if (
      !Object.values(whereHouseRequestStatus).includes(
        params.status.toUpperCase() as whereHouseRequestStatus
      )
    ) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status provided");
    }

    andConditions.push({
      status: params.status.toUpperCase() as whereHouseRequestStatus,
    });
  }

  const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.whereHouseRequest.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      parcelId: true,
      whereHouseId: true,

      status: true,
      createdAt: true,
      updatedAt: true,
      parcel: {
        select: {
          id: true,
        },
      },
      whereHouse: {
        select: {
          id: true,
        },
      },
    },
  
  });

  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.whereHouseRequest.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "whereHouseRequest not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.whereHouseRequest.update({
      where: { id },
      data,
    });
    return result;
  });
  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.whereHouseRequest.delete({
      where: { id },
    });
    if (!deletedItem) {
      throw new ApiError(httpStatus.NOT_FOUND, "whereHouseRequest not found");
    }
    return deletedItem;
  });

  return transaction;
};

const whereHouseParcelSend = async (requestId: string) => {
  if (!requestId) {
    throw new ApiError(httpStatus.NOT_FOUND, "parcel id not found");
  }
  const isExist = await prisma.whereHouseRequest.findFirst({
    where: { id: requestId },
  });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "parcel not found");
  }
  const update = await prisma.whereHouseRequest.update({
    where: { id: isExist.id },
    data: { status: whereHouseRequestStatus.SEND },
  });
  return update;
};

const afterPaymentChangeStatus = async (requestId: string) => {
  if (!requestId) {
    throw new ApiError(httpStatus.NOT_FOUND, "parcel id not found");
  }

  const isExistPaymentRequest = await prisma.paymentRequest.findFirst({
    where: { id: requestId },
  });
  if (!isExistPaymentRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, "payment request not found");
  }
  const update = await prisma.paymentRequest.update({
    where: { id: isExistPaymentRequest.id },
    data: { status: paymentStatus.COMPLETE },
  });

  return update;
};

const payLetter = async (requestId: string) => {
  if (!requestId) {
    throw new ApiError(httpStatus.NOT_FOUND, "parcel id not found");
  }

  const isExist = await prisma.paymentRequest.findFirst({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      type: true,
      amount: true,
      userId: true,
      cardId: true,
      bankId: true,
      user: { select: { email: true, fullName: true, customerId: true } },
    },
  });
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "payment request not found");
  }
// TODO
  // if (isExist.status === paymentStatus.COMPLETE) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, "payment already completed");
  // }
  // if (isExist.status === paymentStatus.PAY_LATER) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, "payment already pay later");
  // }
let customerId = isExist.user.customerId;
  if(!customerId){
    // Create a new customer in Stripe if customerId doesn't exist
    const customer = await stripe.customers.create({
      email: isExist.user.email,
      name: isExist.user.fullName,
    });

    // Update the user in your database with the new customerId
    await prisma.user.update({
      where: { id: isExist.userId },
      data: { customerId: customer.id },
    });

    customerId = customer.id;
  }
  // const invoiceItem = await stripe.invoiceItems.create({
  //     customer: customerId,
  //     amount: Math.round(isExist.amount * 100),
  //     currency: "usd",
  //     description: "Pay Later Invoice",
  //   });
  //     const invoice = await stripe.invoices.create({
  //     customer: customerId,
  //     auto_advance: true, 
  //     collection_method: "send_invoice",
  //     days_until_due: 7, 
  //   });
  //   await stripe.invoices.sendInvoice(invoice.id);
    // console.log({invoice,invoiceItem});

  const update = await prisma.paymentRequest.update({
    where: { id: isExist.id },
    data: { status: paymentStatus.PAY_LATER },
  });

  return update;
};
export  const makeInvoiceForAdmin = async ()=> {
    const pdf = await generateInvoice();
  if (!pdf) {
    console.log("⚠️ No invoice generated (no PAY_LATER requests).");
    return;
  }
  await invoiceSender(pdf, "Weekly Pay Later Invoice");
};


export const whereHouseRequestService = {
  createIntoDb,
  getReceivedParcel,
  getByIdFromDb,
  afterPaymentChangeStatus,
  updateIntoDb,
  deleteItemFromDb,
  whereHouseParcelSend,
  makeInvoiceForAdmin,
  payLetter,
};
