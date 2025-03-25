const express=require("express")
showsh=0
showp=0
showa=0
/********************backend*********************/
const sant=require("sanitize-html")
const cookieparser=require("cookie-parser")
require("dotenv").config()
const jwt=require("jsonwebtoken")
const bcry=require("bcrypt")
const db=require("better-sqlite3")("DATABBB.db")
db.pragma("journal_mode = WAL")
//making database for users
const creatables=db.transaction(()=>{
db.prepare(`CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username STRING NOT NULL UNIQUE,
 national_id STRING NOT NULL UNIQUE,
 mobilenumber STRING NOT NULL UNIQUE,
 password STRING NOT NULL
)`).run()
db.prepare(`CREATE TABLE IF NOT EXISTS posts(
id INTEGER PRIMARY KEY AUTOINCREMENT,
createdDate TEXT,
title STRING NOT NULL,
body TEXT,
authorid INTEGER,
FOREIGN KEY (authorid) REFERENCES users(id)
)`).run()
db.prepare(`CREATE TABLE IF NOT EXISTS school(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    studentname STRING NOT NULL,
    studentnation STRING NOT NULL,
    schoolname STRING NOT NULL,
    schoolid INTEGER,
    FOREIGN KEY (schoolid) REFERENCES users(id)
    )`).run()
db.prepare(`CREATE TABLE IF NOT EXISTS apartment(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apatname STRING NOT NULL,
        apataddr STRING NOT NULL,
        apatsale STRING NOT NULL,
        apatcomp STRING NOT NULL,
        apatid INTEGER,
        FOREIGN KEY (apatid) REFERENCES users(id)
)`).run()    
})
creatables() //calling function

//*******************************************frontend*****************************/
const app=express()
app.set("view engine","ejs")

app.use(express.urlencoded({extended:false}))
app.use(express.static("public"))
app.use(cookieparser())
app.use(function(req,res,next) {
res.locals.errors=[]
//try decode incomig cookie
try {
    req.user=jwt.verify(req.cookies.ourCook,"helooooo")
} catch (err) {
    req.user=false
}
res.locals.user=req.user
console.log(res.locals.user)
next()    
})

app.get("/",(req,res)=>{
 //show all posts done by user//   
if(req.user){
showp=db.prepare("SELECT * FROM posts WHERE authorid=? ORDER BY createdDate Desc").all(req.user.userid)
return res.render("dashboard")}
res.render("homepage")}
)

app.get("/login",(req,res)=>{
    res.render("login")})
app.get("/logout",(req,res)=>{res.clearCookie("ourCook") 
res.redirect("/")})
app.get("/signup",(req,res)=>{res.render("./signup")})
//check if user still logged in//
function mustbeloggedin(req,res,next) {
    if (req.user) {
    next()
    }
    else{
    res.redirect("./")
    next()    
    }    
    }
app.get("/dashboard",mustbeloggedin,(req,res)=>{
showp=db.prepare("SELECT * FROM posts WHERE authorid=? ORDER BY createdDate Desc").all(req.user.userid)
showsh=db.prepare("SELECT * FROM school WHERE schoolid=?").all(req.user.userid)
showa=db.prepare("SELECT * FROM apartment WHERE apatid=?").all(req.user.userid)
    res.render("dashboard")})

app.get("/create-post",mustbeloggedin,(req,res)=>{res.render("./create-post")})
function sharedpostvalidation(req) {
    const errors=[]
    if (typeof(req.body.title)!=="string") req.body.title=""
    if (typeof(req.body.body)!=="string") req.body.body=""
    //to prevent XSS(Dom) either by html or js
    req.body.title=sant(req.body.title.trim(),{allowedTags:[],allowedAttributes:{}})
    req.body.body=sant(req.body.body.trim(),{allowedTags:[],allowedAttributes:{}})
    if (!req.body.title) errors.push("برجاء ادخال عنوان الشكوي")
    if (!req.body.body) errors.push("برجاء ادخال محتوي الشكوي")
    return errors}


app.get("/create-schl",mustbeloggedin,(req,res)=>{res.render("./create-schl")})
function sharedschlvalidation(req) {
    const errors=[]
    if (typeof(req.body.studentname)!=="string") req.body.studentname=""
    if (typeof(req.body.studentnation)!=="string") req.body.studentnation=""
    if (typeof(req.body.schoolname)!=="string") req.body.schoolname=""
    //to prevent XSS(Dom) either by html or js
    if (!req.body.studentname ) errors.push("برجاء ادخال اسم الطالب بشكل صحيح")
    if (!req.body.studentnation ||(req.body.studentnation.length!=14)) errors.push("برجاء ادخال الرقم القومي الصحيح")
    if (!req.body.studentname ) errors.push("برجاء ادخال اسم المدرسة بشكل صحيح")
    return errors}


app.get("/create-apat",mustbeloggedin,(req,res)=>{res.render("./create-apat")})
function sharedapatvalidation(req) {
    const errors=[]
    if (typeof(req.body.apatname)!=="string") req.body.apatname=""
    if (typeof(req.body.apataddr)!=="string") req.body.apataddr=""
    if (typeof(req.body.apatsale)!=="string") req.body.apatsale=""
    if (typeof(req.body.apatcomp)!=="string") req.body.apatcomp=""

    //to prevent XSS(Dom) either by html or js
    if (!req.body.apatname) errors.push("برجاء ادخال اسم المتقدم")
    if (!req.body.apataddr) errors.push("برجاء ادخال عنوان المتقدم")
    if (!req.body.apatsale) errors.push("برجاء ادخال مفردات مرتب المتقدم")
    else if(Number(req.body.apatsale)>8000) errors.push("لا يمكنك التقدم لطلب السكن نظرا لتخطي الحد الاقصي للمرتب")
    if (!req.body.apatcomp) errors.push("برجاء ادخال اسم المشروع المطلوب")
    return errors}

    app.get("/mainpage",(req,res)=>{res.render("mainpage")})
/////***************posts*//////////////////////// */
app.post("/create-apat",mustbeloggedin,(req,res)=>{
    const errors=sharedapatvalidation(req)
    if (errors.length) return res.render("create-apat",{errors})
    const dataresult=db.prepare("INSERT INTO apartment (apatname,apataddr,apatsale,apatcomp,apatid) VALUES (?,?,?,?,?)").run(req.body.apatname,req.body.apataddr,req.body.apatsale,req.body.apatcomp,req.user.userid)
    const getapat=db.prepare("SELECT * FROM apartment WHERE ROWID=?").get(dataresult.lastInsertRowid)
    //editting//
    const showa=db.prepare("SELECT * FROM posts WHERE authorid=? ORDER BY createdDate Desc").all(req.user.userid)
      res.redirect("dashboard")
})

app.post("/create-schl",mustbeloggedin,(req,res)=>{
    const errors=sharedschlvalidation(req)
    if (errors.length) return res.render("create-schl",{errors})
    const dataresult=db.prepare("INSERT INTO school (studentname,studentnation,schoolname,schoolid) VALUES (?,?,?,?)").run(req.body.studentname,req.body.studentnation,req.body.schoolname,req.user.userid)
    const getschl=db.prepare("SELECT * FROM school WHERE ROWID=?").get(dataresult.lastInsertRowid)
    
    //editting//
    const showsh=db.prepare("SELECT * FROM school WHERE schoolid=?").all(req.user.userid)
     res.redirect("dashboard")
    //res.redirect(`/post/${getpost.id}`)
})

app.post("/create-post",mustbeloggedin,(req,res)=>{
    const errors=sharedpostvalidation(req)
    if (errors.length) 
    {return res.render("create-post",{errors})}
    else {const dataresult=db.prepare("INSERT INTO posts (title,body,authorid,createdDate) VALUES (?,?,?,?) ").run(req.body.title,req.body.body,req.user.userid,new Date().toISOString())
    const getpost=db.prepare("SELECT * FROM posts WHERE ROWID=?").get(dataresult.lastInsertRowid)
    
    //editting//
    const showp=db.prepare("SELECT * FROM posts WHERE authorid=? ORDER BY createdDate Desc").all(req.user.userid)
    res.redirect("dashboard")
}
    //res.redirect(`/post/${getpost.id}`)
})
app.post("/login",(req,res)=>{
/////////////////////////////Frontend////////////////////////////////////////////
    let errors=[]
    //check whether usrname and passwords in format string
    if (typeof req.body.national_id!=="string") req.body.national_id=""
    if (typeof req.body.password!=="string") req.body.password=""
    if(req.body.national_id==""){errors.push("الرقم القومي غير صحيح")}//for removing space
    if(req.body.password==""){errors.push("كلمة المرور غير صحيحة")}//for removing space
    if(errors.length) return res.render("login",{errors})
const nationalcompare=db.prepare("SELECT * FROM users WHERE NATIONAL_ID=?").get(req.body.national_id)
if(!nationalcompare){ errors=["الرقم القومي غير صحيح"]
    res.render("login",{errors})}
const userpass=bcry.compareSync(req.body.password,nationalcompare.password)
if(!userpass){
    errors=["الرقم القومي و كلمة المرور غير متطابقين"]
   return  res.render("login",{errors})}
//give the users cookie to homepage
const tokn=jwt.sign({exp:Math.floor(Date.now()/1000)+60*60*24, skyColor:"blue", userid:nationalcompare.id,username:nationalcompare.username,usernation:nationalcompare.national_id}
,"helooooo")
res.cookie("ourCook",tokn,{httpOnly:true,secure:true,sameSite:"strict",maxAge:1000*60*60*24})
    showp=db.prepare("SELECT * FROM posts WHERE authorid=? ORDER BY createdDate Desc").all(req.user.userid)
    res.redirect("mainpage")
})



app.post("/register",(req,res)=>{

/////////////////////////////Frontend////////////////////////////////////////////
    
    const errors=[]
    //check whether usrname and passwords in format string
    if (typeof req.body.username!=="string") req.body.username=""
    if (typeof req.body.password!=="string") req.body.password=0
    if (typeof req.body.mobilenumber!=="string") req.body.mobilenumber=0
    if (typeof req.body.national_id!=="string") req.body.national_id=0

    req.body.username.trim()//for removing space
    
    if(req.body.username=="")errors.push("برجاء ادخال اسم المستخدم")
    else if(req.body.username && (req.body.username.length<6 || req.body.username.length>20))errors.push("اسم المستخدم لا يقل عن 6 ولا يزيد عن 20")
    
    //check if username is not unique
    const usercheck=db.prepare("SELECT *FROM users WHERE USERNAME=?").get(req.body.username)
    if (usercheck) {
        errors.push("اسم المستخدم موجود بالفعل, برجاء التعديل")
    }
    if (db.prepare("SELECT *FROM users WHERE NATIONAL_ID=?").get(req.body.national_id)) {
        errors.push("برجاء تغيير الرقم القومي")
    }
    if (db.prepare("SELECT *FROM users WHERE MOBILENUMBER=?").get(req.body.mobilenumber)) {
        errors.push("برجاء تغيير رقم الهاتف")
    }
    if(req.body.mobilenumber==0)errors.push("برجاء ادخال رقم الهاتف")
    else if(req.body.mobilenumber && req.body.mobilenumber.length!=11) errors.push("برجاء ادخال رقم الهاتف مكون من 11 رقم")

    if(req.body.national_id==0) {errors.push("برجاء ادخال الرقم القومي")}
    else if(req.body.national_id && req.body.national_id.length!=14) errors.push("برجاء ادخال الرقم القومي مكون من 14 رقم")

    

    //check password
    if(req.body.password==0)errors.push("برجاء ادخال كلمة المرور")
    else if(req.body.password && (req.body.password.length<8 || req.body.password.length>12))errors.push("برجاء ادخال كلمة مرور من 8 الي 12")
    
    if(errors.length) { db.prepare("DELETE FROM users WHERE id=?").run(req.params.id)
       return res.render("homepage",{errors})}

/////////////////////////////Backend////////////////////////////////////////////

//for hash password//
req.body.password=bcry.hashSync(req.body.password,bcry.genSaltSync(10))

//inserting rows to database
const result=db.prepare("INSERT INTO users(username,password,national_id,mobilenumber) VALUES(?,?,?,?)").run(req.body.username,req.body.password,req.body.national_id,req.body.mobilenumber)
const findd=db.prepare("SELECT * FROM users WHERE ROWID=?").get(result.lastInsertRowid)

//for login users//
const tokn=jwt.sign({exp:Math.floor(Date.now()/1000)+60*60*24, skyColor:"blue", userid:findd.id, username:findd.username,usernation:findd.national_id}
,"helooooo")

res.cookie("ourCook",tokn,{
    httpOnly:true,
    secure:true,
    sameSite:"strict",
    maxAge:1000*60*60*24
    })

/////////////////////////////Finishing////////////////////////////////////////////



///////////////////////**********schools *//////////////////////////////////////////



//////////////////////////////////*******apartments*//////////////////


res.redirect("login")
})
app.listen(1500)