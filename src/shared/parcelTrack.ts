import prisma from "./prisma"

export const parcelTrackings=async (orderId:string,title:string)=>{
const result = await prisma.parcelTrack.create({data:{orderId:orderId,title:title}})

}