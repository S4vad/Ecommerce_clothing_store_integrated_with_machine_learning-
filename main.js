import path from "path";
import express from "express"
import mongoose from "mongoose"

import connectToDatabase from "./config/db_connection.js";
import { fileURLToPath } from "url";
import adminRoute from "./routes/adminRoute.js"
import userRoute from "./routes/userRoute.js"
import morgan from "morgan";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";


const app=express();




connectToDatabase();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"))

const __dirname=path.dirname(fileURLToPath(import.meta.url))

const publicUserDirectoryPath = path.join(__dirname, "public", "user");
app.use(express.static(publicUserDirectoryPath));

app.use(fileUpload())


// view engin setup
app.set("views",path.join(__dirname,"views"))
app.set('view engine','ejs')

// app.engine('hbs',hbs(extname)

app.use("/admin",adminRoute);
app.use('/',userRoute);

app.use(cookieParser());


const port = process.env.PORT || 3000;
app.listen(port,()=>{
    console.log('server running successfully',port)
})

