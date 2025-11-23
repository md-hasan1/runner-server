import express from "express";
import { userRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { DeliveryInfoRoutes } from "../modules/DeliveryInfo/DeliveryInfo.routes";
import { BankInfoRoutes } from "../modules/BankInfo/BankInfo.routes";
import { CardInfoRoutes } from "../modules/CardInfo/CardInfo.routes";
import { AdminRoutes } from "../modules/Admin/Admin.routes";
import { WhereHouseRequestRoutes } from "../modules/WhereHouseRequest/WhereHouseRequest.routes";
import { MerchantRoutes } from "../modules/Merchant/Merchant.routes";
import { ProvOfDeliveryRoutes } from "../modules/ProvOfDelivery/ProvOfDelivery.routes";


const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/deliveryInfo",
    route: DeliveryInfoRoutes,
  },
  {
    path: "/bankInfo",
    route: BankInfoRoutes,
  },
  {
    path: "/cardInfo",
    route: CardInfoRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/whereHouse",
    route: WhereHouseRequestRoutes,
  },
  {
    path: "/merchant",
    route: MerchantRoutes,
  },
  {
    path: "/prov",
    route: ProvOfDeliveryRoutes,
  },

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
