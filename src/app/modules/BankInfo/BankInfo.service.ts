

import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiErrors';


const createIntoDb = async (data: any,userId:string) => {
  const isExisting=await prisma.bankInfo.findFirst({where:{userId:userId}})
  if(isExisting){
  throw new ApiError(httpStatus.ACCEPTED,"You can not add more then one ")
  }
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.bankInfo.create({data:{userId,...data} });
    return result;
  });

  return transaction;
};

const getListFromDb = async () => {
  
    const result = await prisma.bankInfo.findMany();
    return result;
};

const getByIdFromDb = async (id: string) => {
  
    const result = await prisma.bankInfo.findUnique({ where: { id } });
    if (!result) {
      throw new Error('bankInfo not found');
    }
    return result;
  };



const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.bankInfo.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.bankInfo.delete({
      where: { id },
    });
    return deletedItem;
  });

  return transaction;
};
;


const getBankInfoBaseUser=async(userId:string)=>{
const result =await prisma.bankInfo.findMany({where:{userId}})
return result
}
export const bankInfoService = {
createIntoDb,
getListFromDb,
getByIdFromDb,
updateIntoDb,
deleteItemFromDb,
getBankInfoBaseUser
};