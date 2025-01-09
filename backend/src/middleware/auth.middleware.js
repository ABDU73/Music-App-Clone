import { clerkClient } from "@clerk/express";  // Clerk client to fetch user data

// Protect route middleware - ensures user is authenticated
export const protectRoute = async (req, res, next) => {
	// Check if the user is authenticated by verifying if userId exists in the auth object
	if (!req.auth.userId) {
		return res.status(401).json({ message: "Unauthorized - you must be logged in" });
	}
	next();  // Proceed to the next middleware/route if authenticated
};

// Require admin middleware - ensures the user is an admin
export const requireAdmin = async (req, res, next) => {
	try {
		// Fetch user details using Clerk client by userId from req.auth
		const currentUser = await clerkClient.users.getUser(req.auth.userId);

		// Check if the current user is an admin by comparing email address
		const isAdmin = process.env.ADMIN_EMAIL === currentUser.primaryEmailAddress?.emailAddress;

		// If not an admin, return a 403 Forbidden status
		if (!isAdmin) {
			return res.status(403).json({ message: "Unauthorized - you must be an admin" });
		}

		next();  // Proceed to the next middleware/route if user is admin
	} catch (error) {
		// Catch and pass any errors to the error handler
		console.error('Error verifying admin status:', error);
		next(error);
	}
};
