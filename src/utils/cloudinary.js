import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";


    // Configuration
    cloudinary.config({ 
        cloud_name: process_params.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process_params.env.CLOUDINARY_API_KEY, 
        api_secret: process_params.env.CLOUDINARY_API_SECRET 
    });
    
    const uploadOnCloudinary = async (localFilePath) => {
        try {
            if (!localFilePath) {
                return null
            }
            //upload the file on cloudinary
          const response = await cloudinary.uploader.upload(localFilePath,{
                resource_type: 'auto'
            })
            console.log("File is uploaded on Cloudinary: ",response.url)
            return response;
        } catch (error) {
            fs.unlinkSync(localFilePath) //it just remove the locally saved temporary file
            return null;
        }
    }

  export { uploadOnCloudinary }
    
