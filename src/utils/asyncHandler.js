
// const asyncHandler = (fn) => {
//     return async(req,res,next) => {
//           try {
                     
//             await fn(req,res,next)

//           } catch (error) {
//             res.status(error.code || 500).json({
//                 success: false,
//                 messsage: error.messsage
//             })
//           }
//     }
// }

const asyncHandler = (requstHandler) => {
       (req,res,next) => {
        Promise.resolve(requstHandler(req,res,next)).catch((err) => next(err))
       }
}

export { asyncHandler }