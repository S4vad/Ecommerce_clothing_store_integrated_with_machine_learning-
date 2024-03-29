import jwt from "jsonwebtoken";
import adminModel from "../models/adminSchema.js"
import product from "../models/adminAddProductSchema.js"
import bcrypt from "bcrypt";

export async function adminHome(req,res){
        res.render('admin/index')
}
    


export function adminLoginPage(req,res){
    res.render('admin/adminLogin',{message:""})
}

export function adminSignupPage(req,res){
    res.render('admin/adminRegister')
}

export function addProduct(req,res){
    res.render('admin/addProduct')
}

export function product_list(req,res){
    res.render('admin/product_list')
}



export async function adminSignup(req,res){
    console.log(req.body)
    const {userName,password}=req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // console.log(hashedPassword)
        await adminModel.create({userName:userName,password:hashedPassword})
        
        res.redirect('/admin')
        
    } catch (error) {
        console.log(error.message)
        res.send("<script>alert('product not created successully');</script>")

    }
    
}


 export async function adminLogin(req,res){
    console.log(req.body)
    const {userName,password}=req.body;
    try {
        const emailExist=await adminModel.findOne({userName})
        console.log(emailExist)
        if(!emailExist){
            
            return res.render('admin/adminLogin',{message:"email is not registerd "})
            
        }
        const istrue= bcrypt.compare(password, emailExist.password);
        if(!istrue){
            return res.render('admin/adminLogin',{message:"your password is wrong"})


        }
        const token=jwt.sign({adminID:emailExist._id},"sunoos",{expiresIn:"5d"})
        res.cookie("jwts",token,{httpOnly:true})
        return res.redirect('/admin')



        
    } catch (error) {
        console.log(error.message)
 
        
        
    }
    
}


export async function productAdd(req,res){

    try {
        const {name,category,price,description}=req.body;
        const image=req.files.image;
        await product.create({Name:name,Category:category,Price:price,Description:description});
        res.send("<script>alert('product created successfully')</script>")
        res.redirect('/')
    } catch (err) {
        console.log(err)

        
    }
    // console.log(req.body)
    // console.log(req.files.image)

}
