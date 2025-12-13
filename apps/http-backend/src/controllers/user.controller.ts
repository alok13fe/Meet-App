import {z} from 'zod';
import { Request, Response } from 'express';
import { registerSchema, loginSchema, googleUserSchema } from '@repo/common/schema';
import { User } from '@repo/db/main';

async function registerUser(req: Request,res: Response): Promise<void>{
  try {
    const { firstName, lastName, email, password } = req.body;

    /* Input Validation */
    const validateUser = registerSchema.parse({
      firstName,
      lastName,
      email,
      password
    });

    /* Checking if user already Exists*/
    const userExists = await User.findOne({
      email
    });
    
    if(userExists){
      res
      .status(409)
      .json({
        message: 'User Already Exists. Please Login!'
      });
      return;
    }

    /* Creating New User */
    await User.create({
      firstName,
      lastName,
      email,
      password
    });

    res
    .status(201)
    .json({
      message: 'Registeration successful! You can now log in.',
    });
  } catch(error){
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }

    res
    .status(500)
    .json({
      message: "Server error: Unable to register user at this time.",
      error: error
    });
  }
}

async function loginUser(req: Request, res: Response): Promise<void>{
  try {
    const { email, password } = req.body;

    /* Input Validation */
    loginSchema.parse({
      email,
      password
    });

    /* Getting user from Database*/
    const user = await User.findOne({
      email
    }).select('+password');

    if (!user) {
      res
      .status(403)
      .json({
        message: "Invalid Credentials"
      });
      return;
    }

    /* Validating User Password */
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res
      .status(403)
      .json({
        message: "Invalid Credentials"
      });
      return;
    }

    const loggedUser = await User.findById(user._id);
    const token = user.generateJWT();

    res
    .status(200)
    .json({
      data: {
        user: loggedUser,
        token
      },
      message: 'Login Successful'
    });
  } catch(error){
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }

    res
    .status(500)
    .json({
      message: "Server error: Unable to login user at this time.",
      error: error
    })   
  }
}

export async function google(req:Request, res: Response) {
  try {
    const { firstName, lastName, email } = req.body;

    /* Input Validation */
    googleUserSchema.parse({
      firstName,
      lastName,
      email
    });

    /* Check if User Already Exists */
    const user = await User.findOne({ 
      email
    });

    if(user){
      /* Generating JWT Token */
      const token = user.generateJWT();

      res
      .status(200)
      .json({
        success: true,
        data: {
          user, 
          token
        },
        message: 'Login Successful'
      });
      return;
    }

    /* Registering New User */
    const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: generatedPassword
    });

    newUser.password = "";

    /* Generating JWT Token */
    const token = newUser.generateJWT();

    res
    .status(200)
    .json({
      success: true,
      data: {
        user: newUser, 
        token
      },
      message: 'Login Successful'
    })
  } catch (error) {
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        success: false,
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }
    
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Unable to login user at this time.",
      error: error
    });
  }
}

async function getUserProfile(req: Request, res: Response): Promise<void>{
  try{
     /* Getting user from Database*/
    const user = await User.findById({
      id: req.userId
    });

    res
    .status(200)
    .json({
      data: {
        user
      },
      message: 'User Profile Fetched Successfully!'
    });
  } catch (error){
    res
    .status(500)
    .json({
      message: "Server error: Something went wrong while fetching user profile",
      error: error
    })   
  }
}

export {
  registerUser,
  loginUser,
  getUserProfile
}