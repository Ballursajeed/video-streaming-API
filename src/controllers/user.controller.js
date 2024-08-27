import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req,res) => {
  
    const { fullname, email, username, password } = req.body

    if (
        [fullname, email, username, password].some((field) =>  // check all fields
        field?.trim() === "" )
    ) {
        throw new ApiError(400, "All fields are required!")
     }

    const exitedUser = await User.findOne({ 
        $or: [{ username }, { email }]
     })

     if (exitedUser) {
        throw new ApiError(409, "User with email or username already exist")
     }

     const avatarLocalPath = req.files?.avatar[0]?.path  // grab the avatar 
     const coverImageLocalPath = req.files?.coverImage[0]?.path;  // grab the coverImage 
    
     if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!")
     }

    const avatar = await uploadOnCloudinary(avatarLocalPath) // returns the image url 
    const coverImgage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar can't upload to cloudinary,Please re-upload the avatar")
    }

   const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImgage?.url || "",
        email,
        password,
        username,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user, please try after some time")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!!")
    )

})

export { registerUser }