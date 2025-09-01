const TryCatch=(handler)=>{
    return async (req,res,next)=>{
        try{
            await handler(req,res,next);
        }catch(errror){
            res.status(500).json({
                message: error.message
            })
        }
    }
}

export default TryCatch;