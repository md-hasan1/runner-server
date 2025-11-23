
import httpStatus from 'http-status';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiErrors';


const createIntoDb = async (data: any,userId:string) => {
  const isAlreadyExist = await prisma.cardInfo.findFirst({where: {userId: userId}})
  if(isAlreadyExist){
    throw new ApiError(httpStatus.NOT_ACCEPTABLE,"you cannot create more than one card information")
  }
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.cardInfo.create({ data:{userId,...data} });
    return result;
  });

  return transaction;
};

const getListFromDb = async () => {
  
    const result = await prisma.cardInfo.findMany();
    return result;
};

const getByIdFromDb = async (id: string) => {
  
    const result = await prisma.cardInfo.findUnique({ where: { id } });
    if (!result) {
      throw new Error('cardInfo not found');
    }
    return result;
  };



const updateIntoDb = async (id: string, data: any) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const result = await prisma.cardInfo.update({
      where: { id },
      data,
    });
    return result;
  });

  return transaction;
};

const deleteItemFromDb = async (id: string) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const deletedItem = await prisma.cardInfo.delete({
      where: { id },
    });

    // Add any additional logic if necessary, e.g., cascading deletes
    return deletedItem;
  });

  return transaction;
};
;

const getCardInfoBaseUser=async(userId:string)=>{
const result=await prisma.cardInfo.findMany({where:{userId}})
return result
}

export const cardInfoService = {
createIntoDb,
getListFromDb,
getByIdFromDb,
updateIntoDb,
deleteItemFromDb,
getCardInfoBaseUser
};