import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import httpStatus from "http-status";
import { fileUploader } from "../../../helpars/fileUploader";
import { RiderRequestStatus } from "@prisma/client";

const createIntoDb = async (req: Request) => {
  const files = req.files as any;
  const proveImage = files.proveImage[0];
  const signature = files.signature[0];
  const parcelId = req.params.id;
  const isExistParcel = await prisma.parcel.findFirst({
    where: { id: parcelId },
  });
  if (!isExistParcel) {
    throw new ApiError(httpStatus.NOT_FOUND, "parcel not found");
  }
  const riderAssign = await prisma.parcel.findFirst({
    select: {
      riderRequest: { where: { status: RiderRequestStatus.ACCEPTED } },
    },
  });
  const isAlreadyExistParcel = await prisma.provOfDelivery.findFirst({
    where: {parcelId: parcelId },
  });
  if (isAlreadyExistParcel) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "prove of delivery is already exist"
    );
  }
  const uploadProvImage = (await fileUploader.uploadToLocal(proveImage))
    .Location;
  const uploadSignature = (await fileUploader.uploadToLocal(signature))
    .Location;

  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.provOfDelivery.create({
      data: {
        parcelId,
        proveImage: uploadProvImage,
        signature: uploadSignature,
      },
    });
    return result;
  });

  return transaction;
};

const getListFromDb = async () => {
  const result = await prisma.provOfDelivery.findMany({orderBy: { createdAt: "desc" }});
  return result;
};

const getByIdFromDb = async (id: string) => {
  const result = await prisma.provOfDelivery.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "provOfDelivery not found");
  }
  return result;
};

const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.provOfDelivery.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.provOfDelivery.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
export const provOfDeliveryService = {
  createIntoDb,
  getListFromDb,
  getByIdFromDb,
  updateIntoDb,
  deleteItemFromDb,
};
