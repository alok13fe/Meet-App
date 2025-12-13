import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { User } from "@repo/db/main";

async function authUser(req: Request,res: Response, next: NextFunction): Promise<void>{
  try {
    const token = req.headers["authorization"]?.replace('Bearer ','');
    const decoded = jwt.verify(token as string, process.env.JWT_TOKEN_SECRET as string);

    if(typeof decoded === "object" && "id" in decoded){
      const user = await User.findById({
        _id: decoded?.id
      });

      if(!user){
        res
        .status(401)
        .json({
          statusCode: 401,
          success: false,
          message: "Unauthorized Request",
        })
        return;
      }

      req.userId = user.id;
      next();
    }
    else{
      res
      .status(403)
      .json({
        message: 'Invalid Token'
      });
      return;
    }
  } catch (error) {
    console.log(error);
    res
    .status(403)
    .json({
      message: 'Invalid Token',
      error: error
    });
    return;
  } 
}

export {
  authUser
}