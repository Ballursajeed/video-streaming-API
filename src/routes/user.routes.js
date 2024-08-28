import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserCoverImage } from "../controllers/user.controller.js";
import { uploads } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    uploads.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJwt, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").put(verifyJwt, changeCurrentPassword)
router.route("/current-user").get(verifyJwt,getCurrentUser)
router.route("/update-account").patch(verifyJwt,updateAccountDetails)
router.route("/update-account").patch(verifyJwt,updateAccountDetails)
router.route("/update-avatar").patch(verifyJwt,
      uploads.single("avatar")
     ,updateAccountDetails)
router.route("/update-coverImage").patch(verifyJwt,uploads.single("coverImage"),updateUserCoverImage
)
router.route("/channel/:username").get(verifyJwt,getUserChannelProfile)
router.route("/watch-History").get(verifyJwt,getWatchHistory)

export default router