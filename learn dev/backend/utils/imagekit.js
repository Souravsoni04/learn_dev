import ImageKit from "imagekit";
import dotenv from "dotenv";

dotenv.config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

export const getAuthParams = () => {
  if (!process.env.IMAGEKIT_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE_KEY === "your_private_key_here") {
    console.error("❌ ImageKit Private Key is not configured in .env");
    throw new Error("ImageKit Private Key is not configured");
  }
  return imagekit.getAuthenticationParameters();
};

export default imagekit;
