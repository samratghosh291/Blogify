const { Router } = require("express");
const multer = require('multer');
const path = require("path");
const { uploadCloudinary } = require("../services/cloudinary");
const fs = require('fs');

const Blog = require("../models/blog.model");
const Comment = require("../models/comment.model");

const router = Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve('./public/uploads'));
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({ storage: storage });

router.get("/add-new", (req, res) => {
    return res.render("addBlog", {
        user: req.user,
    });
});

router.get("/:id", async (req, res) => {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");
    console.log("blog", blog);
    console.log("comments", comments);
    return res.render("blog", {
        user: req.user,
        blog,
        comments,
    });
});

router.post("/comment/:blogId", async(req,res)=>{
    const comment = await Comment.create({
        content: req.body.content,
        blogId: req.params.blogId,
        createdBy:req.user._id,
    });
    return res.redirect(`/blog/${req.params.blogId}`);
});

router.post("/", upload.single("coverImage"), async (req, res) => {
    console.log(req.body);  // for testing purpose
    console.log(req.file);  // for debugging

    const { title, blogBody } = req.body;

    // Check if 'blogBody' is present and not empty
    if (!blogBody) {
        // Handle the case where 'blogBody' is missing or empty
        return res.status(400).send("Blog body is required.");
    }

    try {
        // Upload image to Cloudinary
        const cloudinaryResponse = await uploadCloudinary(req.file.path);

        // Check if upload to Cloudinary was successful
        if (cloudinaryResponse && cloudinaryResponse.secure_url) {
            // Log the local file path before removing it
            console.log("Local file path to be removed:", req.file.path);

            // Remove the local file after successful upload
            try {
                // fs.unlinkSync(req.file.path);
                console.log("Local file removed successfully:", req.file.path);
            } catch (unlinkError) {
                console.error("Error removing local file:", unlinkError.message);
            }

            // Proceed with creating the blog entry with the Cloudinary URL
            const blog = await Blog.create({
                title,
                body: blogBody,
                createdBy: req.user._id,
                coverImageURL: cloudinaryResponse.secure_url
            });

            console.log("Blog created:", blog);  // Log the created blog
            return res.redirect("/");
        } else {
            console.error("Failed to upload image to Cloudinary");
            return res.status(500).send("Failed to upload image to Cloudinary");
        }
    } catch (err) {
        console.error("Error creating blog:", err);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
