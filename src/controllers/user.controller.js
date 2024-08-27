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
     //const coverImageLocalPath =   // grab the coverImage 
    
     let coverImageLocalpath;
     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalpath = req.files.coverImage[0].path;
     }

     if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!")
     }

    const avatar = await uploadOnCloudinary(avatarLocalPath) // returns the image url 
    const coverImgage = await uploadOnCloudinary(coverImageLocalpath)

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

const generateAccessAndRefreshToken = async(userId) => {
       try {
          const user = await User.findById(userId)
          const accessToken = user.generateAccessToken()
          const refreshToken = user.generateRefreshToken()

          user.refreshToken = refreshToken
         await user.save({ validateBeforeSave: false })

         return {accessToken, refreshToken}

       } catch (error) {
          throw new ApiError(500, "Something Went Wrong while generating refresh and access token!");
       }    
}

const loginUser = asyncHandler(async (req,res) => {
         //get the username, password form req.body
         //validation of username and password(empty or not)
         //find the user with username
         //and call isPassword method to check the password
         // if it returns true logged the user,
         // -->generate access and refresh token
         // -->send cookie
         //if it returns false then send the response "password or username is invalid"

        const { username, password } = req.body;

        if(username === "" || password === "") {
            throw new ApiError(400, "Username or password is required")
        }        

        const user = await User.findOne({username})

        if (!user) {
            throw new ApiError(404,"User does not Exist")
        }

        const isMatchPassword =  await user.isPasswordCorrect(password)

        if (!isMatchPassword) {
            throw new ApiError(401, "Invalid User credentials")
        }

       const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
       const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

       const option = {
        httpOnly: true,
        secure: true
       }

       return res
       .status(200)
       .cookie("accessToken",accessToken,option)
       .cookie("refreshToken",refreshToken.option)
       .json(
        new ApiResponse(200,{
            user: loggedInUser, accessToken, refreshToken
        },
      "User Logged In Successfully"
    )
       )
})

const logoutUser = asyncHandler(async (req,res) => {
 
    await User.findByIdAndUpdate(
        req.user._id,{
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        }
    )
    const option = {
        httpOnly: true,
        secure: true
       }

       return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(
            new ApiResponse(200,{},"User Logged Out")
        )
})

export { 
    registerUser,
    loginUser,
    logoutUser
 }