const multer = require("multer");

const CustomError = require("../err/CustomError.js");

const path = require("path");

const storage = multer.diskStorage({

    destination : function(req,file,cb){
        
        const rootDir = path.dirname(require.main.filename);
        cb(null,path.join(rootDir,"/public/uploads"));
    },
    filename : function(req,file,cb){

        const extension = file.mimetype.split("/")[1];
        req.savedProfileImage = "image_"+req.use.id+extension;
        cb(null,req.savedProfileImage);
    }
});

const filefilter = (req,file,cb) =>{

    const allowedMimeTypes = ["image/jpg","image/jpeg","image/png"];
    if(!allowedMimeTypes.includes(file.mimetype)){
        return cb(new CustomError("dosya türü yanlış",400),false);
    }
    return cb(null,true);
}
const profileImageUpload = multer({ filefilter ,storage});

module.exports = profileImageUpload;