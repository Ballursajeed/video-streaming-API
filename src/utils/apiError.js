class ApiError extends Error { //Error is a node.js error class
       constructor(
        statusCode,
        message = "Something Went Wrong",
        errors = [],
        stack = ""
       ){
               super(message)
               this.statusCode = statusCode
               this.data = null
               this.message = message
               this.success = false
               this.errors = errors

               if (stack) {
                   this.stack = stack
               } else {
                Error.captureStackTrace(this,this.constructor)
               }

       }
}

export { ApiError }