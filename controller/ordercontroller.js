
// import orderModel from "../models/orderSchema";
import couponModel from "../models/couponSchema.js";
import cartModel from "../models/cartSchema.js";
import wishlistModel from "../models/wishlist.js";
import moment from "moment";
import addressModel from "../models/addressSchem.js";
import getUserCartWishlistData from "../helpers/mainhelper.js";
import Razorpay from "razorpay";
import crypto from 'crypto'; 
import orderModel from "../models/orderSchema.js";
import walletModel from "../models/walletSchema.js";
import productModel from "../models/productSchema.js"


import 'dotenv/config'; // 
import usermodel from "../models/userSchema.js";



const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });


export async function orderGet(req,res) {

    try {
        res.render('user/order')
        
    } catch (error) {
        res.send(error.message)
    }
    
}

export async function order(req,res) {

    const {  user,appliedCoupon} = req.body;

    let discountPercentage;
    if(appliedCoupon){
        const coupon=await couponModel.findOne({code:appliedCoupon});

        discountPercentage = Number(coupon.discount);

    }else{
        discountPercentage=0;
    }

    const cart=await cartModel.findOne({user:user}).populate("products.item");
    
    const subtotal=Number(cart.subtotal)

    const discountAmount = (subtotal * discountPercentage) / 100; // Calculate discount amount
    const amount = Math.floor(subtotal - discountAmount) || subtotal;

    console.log("Calculated amount (in paise):", amount * 100); // Log amount in paise

    const addresses=await addressModel.findOne({user:user}).select('address');
 

    
    if (!addresses) {
        return res.status(400).json({ success: false, message: 'No address found for this user.' });
    }

    const address=addresses._id;

   

    const products = cart.products.map(product => ({ 
        item: product.item._id, 
        quantity: product.quantity 
    })); 
 
    try {
      const options = {
        amount: amount * 100, // Razorpay expects the amount in the smallest currency unit (e.g., paise for INR)
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
      };
  
      const order = await razorpay.orders.create(options);



       // Store product IDs and address for later use
       order.products = products;
       order.address = address;
       order.discount=discountAmount;

       
      res.status(200).json({ success: true, order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Order creation failed' });
    }
    
}


export async function verifyPayment(req,res) {
    try {
        const { payment, order } = req.body;
        const user=req.user;


        console.log('The payment:', JSON.stringify(payment, null, 2));
        console.log('The order:', JSON.stringify(order, null, 2));



        const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${order.id}|${payment.razorpay_payment_id}`)
          .digest('hex');
      
        if (generatedSignature === payment.razorpay_signature) {
          // Generate a unique invoice number
          const invoiceNumber = Math.floor(100000 + Math.random() * 900000);
      
          const newOrder = {
            user: user,
            address: order.address,
            payment: payment.razorpay_payment_id,
            products: order.products,
            totalamount: order.amount / 100,
            discount:order.discount || 0, // Convert back to INR
            status: 'Placed',
            paymentMethod: 'Razorpay',
            invoiceNumber: invoiceNumber,
            invoiceDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          };

      
         const savedOrder= await orderModel.create(newOrder)

          await cartModel.deleteMany({user:user})

          res.status(200).json({ success: true , orderId:savedOrder._id });
        } else {
      
          res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
         
        
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.send(error.message)
        
    }
    
}


export async function orderCod(req, res) {
    const { user, appliedCoupon } = req.body;

    let discountPercentage = 0; // Initialize discount percentage
    if (appliedCoupon) {
        const coupon = await couponModel.findOne({ code: appliedCoupon });
        if (!coupon) {
            return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
        }
        discountPercentage = Number(coupon.discount);

    }

    const cart = await cartModel.findOne({ user: user }).populate("products.item");
    if (!cart) {
        return res.status(400).json({ success: false, message: 'Cart not found.' });
    }
    
    const subtotal = Number(cart.subtotal);
    const discountAmount = (subtotal * discountPercentage) / 100; 


    const amount = Math.floor(subtotal - discountAmount) || subtotal;


    const addresses = await addressModel.findOne({ user: user }).select('address');
    if (!addresses) {
        return res.status(400).json({ success: false, message: 'No address found for this user.' });
    }

    const address = addresses._id;
    const products = cart.products.map(product => ({
        item: product.item._id,
        quantity: product.quantity
    }));

    try {
        const invoiceNumber = Math.floor(100000 + Math.random() * 900000); 
        const newOrder = {
            user: user,
            address: address,
            payment: 'COD',
            products: products,
            totalamount: amount , 
            discount: discountAmount,
            status: 'Placed',
            paymentMethod: 'COD',
            invoiceNumber: invoiceNumber,
            invoiceDate: new Date(),
            dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), 
        };

        const savedOrder = await orderModel.create(newOrder);
    

        await cartModel.deleteMany({ user: user }); 
        res.status(200).json({ success: true, orderId: savedOrder._id }); 
    } catch (error) {
        console.error('Error creating order:', error.stack); 
        res.status(500).json({ success: false, message: 'Order creation failed' }); 
    }
}



async function expiredCouponUpdating(expiredCouponIds){
    for (const id of expiredCouponIds){
        
        try {
            await couponModel.findByIdAndUpdate(id,{$set:{isExpired:true}});  

        } catch (error) {
            console.log("error deleting coupon")
            
        }
    }
}


export async function coupon(req,res) {

    try {

        const coupons=await couponModel.find()

        const currentDate = new Date();

        var expiredCouponIds = coupons
        .filter( coupon => coupon.endDate<currentDate )
        .map( coupon =>coupon._id )

        expiredCouponUpdating(expiredCouponIds)
 

        const userId = req.user; 
        const { user, cart, cartCount, wishListCount } = await getUserCartWishlistData(userId);

        res.render('user/coupon',{coupons:coupons,user,cartCount,wishListCount,moment,cart:cart})
        
    } catch (error) {
        res.send(error.message)
    }
    
}


export async function checkout(req,res) {

    try {
        const coupon=await couponModel.find()

        const userId = req.user; 
        const { user, cart, cartCount, wishListCount } = await getUserCartWishlistData(userId);

        const address=await addressModel.findOne({user:userId}).select('address') ;
 

        res.render('user/checkout',{
            coupons:coupon,
            user,
            cartCount,
            wishListCount,
            moment,
            cart:cart,
            address,
            alert:false,
            discount:345,
            totalDiscount:345})
        
    } catch (error) {
        res.send(error.message)
    }
    
}




export async function applyCoupon(req, res) {
    try {
        const userCouponCode = req.body.coupon.trim(); // Trim to remove any extra spaces
        const userId = req.user; 

        const appliedCoupon = await couponModel.findOne({ code: userCouponCode });

        if (!appliedCoupon) {
            return res.json({ success: false, message: 'Invalid code' });
        }

        const isExpired = appliedCoupon.isExpired;
        if (isExpired) {
            return res.json({ success: false, message: 'Coupon expired' });
        }

        //checking user is already used coupon or not

        const usedUser=appliedCoupon.users.find(user=>user.userId.toString()===userId.toString())
        const isUsed=usedUser?usedUser.isUsed : false;
        
        if (isUsed){
            return res.json({success:false,message:'The coupon is already used'})

        }

        const discountPercentage = Number(appliedCoupon.discount);
        
        const cart = await cartModel.findOne({ user: userId })

        const subtotal = Number(cart.subtotal); 
        const discountAmount = (subtotal * discountPercentage) / 100; // Calculate discount amount
        const newSubTotal = Math.floor(subtotal - discountAmount);


        await cart.save();

        const user={userId:userId,isUsed:true}

        appliedCoupon.users.push(user)

        await appliedCoupon.save()

        res.clearCookie('couponDetails');
        res.cookie('couponDetails', JSON.stringify({
            discountPercentage,
            discountAmount,
            newSubTotal,
            couponCode: userCouponCode
        }), { httpOnly: true, maxAge: 5 * 60 * 1000 }); // Cookie expires in 30 minutes
        

        res.json({ success: true, message: `Applied ${discountPercentage}% discount`, 
            newSubTotal: newSubTotal ,
            couponCode:userCouponCode,
            discountPercentage:discountPercentage,
            discountAmount:discountAmount
        });



    } catch (error) {
        res.send(error.message);
    }
}


export async function orderSuccess(req, res) {
    try {
        const userId = req.user;
        const  orderId = req.query.orderId;
        console.log("the userId "+userId,orderId)

        const orders = await orderModel.findOne({ _id: orderId, user: userId })
        .populate({ path:'products.item',
                    select:'Name Images Brand Price'
                }) 
        .populate('user') 
        .populate('address')        
        console.log('Fetched orders:', JSON.stringify(orders, null, 2));


        const userDetails = await usermodel.findOne({ _id: userId });

        const { cart, cartCount, wishListCount } = await getUserCartWishlistData(userId);

       
        


        const structuredOrders = {
            id: orders._id,
            totalAmount: orders.totalamount,
            createdAt: orders.createdAt,
            invoiceNumber: orders.invoiceNumber,
            invoiceDate: orders.invoiceDate,
            discount: orders.discount,
            products: orders.products.map(product => ({
                name: product.item.Name,
                image: product.item.Images[0],
                price: product.item.Price,
                brand: product.item.Brand,
                quantity: product.quantity
            }))
        };

        // console.log('Structured orders:', JSON.stringify(structuredOrders, null, 2));

        // Render the EJS template with structured data
        res.render('user/orderSuccess', {
            order: structuredOrders,
            user: userDetails,
            wishListCount,
            cartCount,
            cart
        });

        
    } catch (error) {
        // Handle the error and render an error message if needed
        console.error('Error fetching order success:', error);
        res.status(500).send('An error occurred while fetching order details.');
    }
}


export async function orderCancel(req, res) {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.json({ success: false, message: "Order ID not provided" });
        }

        const order = await orderModel.findById(orderId).populate('products.item');
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        const products=order.products.map((product)=>({
            productId:product.item,
            quantity:product.quantity

        }))
        for (const product of products){
            const update = await productModel.findById(product.productId);
            if (update) {
                update.Stock += product.quantity;

                await update.save();
              } else {
                res.json({ success: false, message: `Product with ID ${product.productId} not found.`});
              }
        }


        const userId = order.user;
        let refundAmount = 0;


        if (order.paymentMethod === 'Razorpay') {
            refundAmount = order.totalamount;
        }

        const updatedOrder = await orderModel.findByIdAndUpdate(
            orderId,
            { status: "canceled" },
            { new: true } // Return the updated document
        );

        if (updatedOrder) {
            const existingWallet = await walletModel.findOne({ user: userId });

            if (existingWallet) {
                existingWallet.balance += refundAmount;
                await existingWallet.save();
            } else {
                await walletModel.create({
                    user: userId,
                    balance: refundAmount
                });
            }
            
            res.json({ success: true, message: 'Order canceled and wallet updated.', refundAmount: refundAmount });

        } else {
            res.json({ success: false, message: "Failed to update order status" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message});
    }
}



export async function changeStatus(req,res){
    try {
        const { orderId,status} = req.body; 

        await orderModel.findByIdAndUpdate(orderId,{status:status})
        res.json({success:true})
    } catch (error) {
        res.json({success:false})
        res.send(error.message)
        
    }
}




export async function addBuyNow(req,res) {
    try {
        const productId=req.query.productId;
        const quantity = req.body.quantity || 1;
        const from  = req.query.from;

        const userId = req.user; 
        const { user, cart, cartCount, wishListCount,wallet} = await getUserCartWishlistData(userId);

        const product=await productModel.findById(productId)
        const coupon=await couponModel.find()
        const address=await addressModel.findOne({user:userId}).select('address') ;

        const couponDetails = JSON.parse(req.cookies.couponDetails || '{}');

        const current_product_specific = await productModel.findById(productId); 
        const stock = current_product_specific.Stock;
        const updatedStock = stock - quantity;

        if (updatedStock >= 0) {
            res.render('user/buyNow',{
                coupons:coupon,
                user,
                cart,
                wallet,
                cartCount,
                wishListCount,
                moment,
                product,
                address,
                quantity,
                couponDetails
            })
    
        }

        if (updatedStock < 0) {
            const redirectUrl = from === 'productDetails' ? `/productDetails/${productId}` : `/quickView/${productId}`;
            return res.redirect(redirectUrl);
        }
        
    } catch (error) {
        res.send(error.message)
        
    }
    
}

