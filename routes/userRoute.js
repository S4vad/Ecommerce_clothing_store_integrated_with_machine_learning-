import express, { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import {userHome,signup,userSignup,login,userLogin,shop,logout,quickView,productDetails,cart,cartAdd,aboutPage,contactPage,addContact,wishlist,wishlistAdd,filter,categoryShop,search,cartDelete,cartSubTotalUpdate} from "../controller/usercontroller.js";
import {order,orderGet,coupon} from "../controller/ordercontroller.js"
import { userAuthentication } from "../middlewares/userauthentication.js";



const routes=express.Router();

const __dirname=path.dirname(fileURLToPath(import.meta.url))
const publicUserDirectoryPath = path.join(__dirname, "public");
routes.use(express.static(publicUserDirectoryPath));



routes.get('/',userAuthentication,userHome)

routes.get('/signup',signup)
routes.get('/login',login)
routes.get('/shop',userAuthentication,shop)//req,res,next we get both controller and middleware
routes.get('/quickView/:id',userAuthentication,quickView)
routes.get('/logout',logout)
routes.get('/productDetails/:id',userAuthentication,productDetails)
routes.get('/cart',userAuthentication,cart)
routes.get('/wishlist',userAuthentication,wishlist)
routes.get('/about',userAuthentication,aboutPage)
routes.get('/contact',userAuthentication,contactPage)
routes.get('/categoryShop',userAuthentication,categoryShop)
routes.get('/order',userAuthentication,orderGet)
routes.delete('/cart/remove/:id',userAuthentication,cartDelete)
routes.get('/coupon',userAuthentication,coupon)


routes.post('/signin',userSignup)
routes.post('/userlog',userLogin)
routes.post('/cart',userAuthentication,cartAdd)
routes.post('/wishlist/:id',userAuthentication,wishlistAdd)
routes.post('/contact',userAuthentication,addContact)
routes.post('/filter',userAuthentication,filter)
routes.post('/search',userAuthentication,search)
routes.post('/order',userAuthentication,order)
routes.post('update/:id/:price/:subTotal',cartSubTotalUpdate)







export default routes;