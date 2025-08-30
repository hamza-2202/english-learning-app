import asyncHandler from "express-async-handler";
import { User } from "../models/User.model.mjs";
import bcrypt from "bcrypt"

const createUser = asyncHandler( async (request, response) => {
    const { name, email, role, password } = request.body

    const userExists = await User.findOne({email})
    if(userExists){
        response.status(400)
        throw new Error(`User with this email already exists`)
    }
    const user = await User.create({name, email, role, password})
    response.status(201).json({
        message: `User created successfully`,
        user
    })
})

const getAllUsers = asyncHandler( async (request, response) => {
    const users = await User.find().select('-password')
    if(users.length === 0){
        response.status(404)
        throw new Error(`Users not found`)
    }

    response.status(200).json({
        count: users.length,
        users
    })
})

const getSingleUser = asyncHandler( async (request, response) => {
    const user = await User.findById(request.params.id).select('-password')
    if(!user){
        response.status(404)
        throw new Error(`User not found`)
    }
    response.status(200).json({
        user
    })
})

const updateUser = asyncHandler( async (request, response) => {

    const { name, email, password, level, role } = request.body
    const userExists = await User.findById(request.params.id)

    const userLevel = ["beginner", "intermediate", "advance"]
    if( level && !userLevel.includes(level) ){
        response.status(400)
        throw new Error(`level "${level}" is not defined`)
    }

    const userRole = ["student", "teacher"]
    if( role && !userRole.includes(role)){
        response.status(400)
        throw new Error(`level "${role}" is not defined`)
    }

    if(!userExists){
        response.status(404)
        throw new Error(`User not found`)
    }

    if(request.user.role.toString() !== 'admin' && request.user._id !== request.params.id){
        response.status(401)
        throw new Error(`Access denied. User not authorized.`)
    }

    let updatedData = {name, email, level}
    if(password){
        const hashedPassword = await bcrypt.hash(password, 10)
        updatedData.password = hashedPassword;
    }

    if(role){
        updatedData.role = role
    }

    const user = await User.findByIdAndUpdate(request.params.id, updatedData, {new: true}).select(-password)
    response.status(201).json({
        message: `User updated successfully`,
        user
    })
})

const deleteUser = asyncHandler( async (request, response) => {

    const user = await User.findById(request.params.id)
    if(!user){
        response.status(404)
        throw new Error(`User not found`)
    }

    if(request.user.role.toString() !== 'admin' && request.user._id !== request.params.id){
        response.status(401)
        throw new Error(`Access denied. User not authorized`)
    }

    await User.findByIdAndDelete(request.params.id)
    response.status(200).json({
        message: `User deleted successfully`
    })
})

export {
    createUser,
    getAllUsers,
    getSingleUser,
    updateUser,
    deleteUser
}