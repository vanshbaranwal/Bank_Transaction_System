const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");



async function authMiddleware(req, res, next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token){
        return res.status(401).json({
            message: "unauthorized access, token is missing",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userId);

        if(!user){
            return res.status(401).json({
                message: "unauthorized access, user not found",
            });
        }

        req.user = user;
        next();

    } catch (error) {
        return res.status (401).json({
            message: "unauthorized access, token is invalid"
        });
    }
};

module.exports = {
    authMiddleware
}