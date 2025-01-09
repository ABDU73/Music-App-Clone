import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../lib/cloudinary.js";
import jwt from 'jsonwebtoken';

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
	try {
		const result = await cloudinary.uploader.upload(file.tempFilePath, {
			resource_type: "auto",
		});
		return result.secure_url;
	} catch (error) {
		console.log("Error in uploadToCloudinary", error);
		throw new Error("Error uploading to cloudinary");
	}
};

export const createSong = async (req, res, next) => {
	try {
		if (!req.files || !req.files.audioFile || !req.files.imageFile) {
			return res.status(400).json({ message: "Please upload all files" });
		}

		const { title, artist, albumId, duration } = req.body;
		const audioFile = req.files.audioFile;
		const imageFile = req.files.imageFile;

		const audioUrl = await uploadToCloudinary(audioFile);
		const imageUrl = await uploadToCloudinary(imageFile);

		const song = new Song({
			title,
			artist,
			audioUrl,
			imageUrl,
			duration,
			albumId: albumId || null,
		});

		await song.save();

		// if song belongs to an album, update the album's songs array
		if (albumId) {
			await Album.findByIdAndUpdate(albumId, {
				$push: { songs: song._id },
			});
		}
		res.status(201).json(song);
	} catch (error) {
		console.log("Error in createSong", error);
		next(error);
	}
};

export const deleteSong = async (songId) => {
	try {
	  const token = localStorage.getItem("authToken");  // Or wherever you store the token
  
	  if (!token) {
		console.error("Token missing, user not authenticated");
		return;
	  }
  
	  const response = await axios.delete(`http://localhost:5000/api/admin/songs/${songId}`, {
		headers: {
		  "Authorization": `Bearer ${token}`,
		},
	  });
  
	  console.log(response.data.message);  // "Song deleted successfully"
	} catch (error) {
	  console.error("Error deleting song:", error.response ? error.response.data : error.message);
	}
  };

export const createAlbum = async (req, res, next) => {
	try {
		const { title, artist, releaseYear } = req.body;
		const { imageFile } = req.files;

		const imageUrl = await uploadToCloudinary(imageFile);

		const album = new Album({
			title,
			artist,
			imageUrl,
			releaseYear,
		});

		await album.save();

		res.status(201).json(album);
	} catch (error) {
		console.log("Error in createAlbum", error);
		next(error);
	}
};

export const deleteAlbum = async (req, res, next) => {
	try {
		const { id } = req.params;
		await Song.deleteMany({ albumId: id });
		await Album.findByIdAndDelete(id);
		res.status(200).json({ message: "Album deleted successfully" });
	} catch (error) {
		console.log("Error in deleteAlbum", error);
		next(error);
	}
};

export const checkAdmin = async (req, res, next) => {
    try {
        // Ensure the user is authenticated by checking req.auth.userId
        if (!req.auth.userId) {
            return res.status(401).json({ message: "Unauthorized - you must be logged in" });
        }

        // Fetch the user details using Clerk's API by the user ID
        const currentUser = await clerkClient.users.getUser(req.auth.userId);

        // Check if the current user is an admin
        const isAdmin = process.env.ADMIN_EMAIL === currentUser.primaryEmailAddress?.emailAddress;

        // If the user is an admin, proceed to the next middleware or route
        if (isAdmin) {
            return res.status(200).json({ admin: true });
        } else {
            // If not an admin, return a 403 Forbidden response
            return res.status(403).json({ message: "Unauthorized - you must be an admin" });
        }
    } catch (error) {
        // If any error occurs, pass it to the error handler
        console.error('Error checking admin status:', error);
        next(error);
    }
};