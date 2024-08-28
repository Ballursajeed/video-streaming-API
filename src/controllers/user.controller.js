import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

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
       .cookie("refreshToken",refreshToken,option)
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

const refreshAccessToken = asyncHandler(async (req,res) => {
    
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if (!incomingRefreshToken) {
            throw new ApiError(401,"Unathorized Request")
        }
        try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401,"Invalid refresh Token!")
        }
    
         if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refreshed Token is expired or Used!")
         }
     
         const option = {
            httpOnly: true,
            secure: true
           }
    
         const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(decodedToken?._id)
      
          return res
           .status(200)
           .cookie("accessToken",accessToken,option)
           .cookie("refreshToken",newRefreshToken,option)
           .json(
            new ApiResponse(200,{
                accessToken,
                refreshToken: newRefreshToken
            },"Access Token Refreshed!")
           )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refreshed Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._d)

    const isMatch = await user.isPasswordCorrect(oldPassword)

    if (!isMatch) {
        throw new ApiError(400, "Invalid Password")
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Password Updated Successfully")
    )
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "Current User Fetched Successfully")
    )
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required!")
    }

     const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },{
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Account details updated Successfully")
    )

})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading on Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(200, { user }, "Avatar is updated Successfully!")
    )

})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(500, "Error while uploading the Cover image!!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
           $set:{
            coverImage:coverImage.url
           }
        },
        {
             new : true
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,{ user }, "Cover Image is updated Successfully!!")
    )

})

const getUserChannelProfile = asyncHandler(async(req,res) => {
     const { username } = req.params

     if (!username?.trim()) {
        throw new ApiError(400, "Username is Invalid")
     }

   const channel = await User.aggregate([
       {
         $match:{
            username: username?.toLowerCase()
         }
       },
       {
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
       },
       {
        $lookup:{
            from: "subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as: "subscribeTo"
        }
       },
       {
            $addFields:{
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubcribedToCount:{
                    $size:"$subscribeTo"
                },
                isSubscribed: {
                    $condiition:{
                        if: {$in: [ req.user?._id, "$subscribers.subscriber" ]},
                        then: true,
                        else: false
                    }
                }
            }
       },
       {
        $project: {
            fullname: 1,
            username: 1,
            subscribersCount: 1,
            channelsSubcribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
       }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    )

})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateAccountDetails,
    updateUserCoverImage,
    getUserChannelProfile
 }