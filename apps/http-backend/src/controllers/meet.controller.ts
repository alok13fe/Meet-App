import { Request, Response } from "express";
import { nanoid } from "nanoid";
import { Meet } from "@repo/db/main";

export async function createMeet(req: Request, res: Response) {
  try {
    let meetId, roomIdExists;
    
    do{
      meetId = nanoid(10);

      roomIdExists = await Meet.findOne({
        slug: meetId
      });
    } while(roomIdExists);

    const room = await Meet.create({
      slug: meetId,
      adminId: req.userId
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        meetId: room.slug,
        adminId: room.adminId
      },
      message: 'Meeting room created successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't create meeting room.",
      error
    });
  }
}

export async function joinMeet(req: Request, res: Response){
  try {
    const { meetId } = req.params;
    
    if(!meetId || typeof(meetId) !== 'string'){
      res
      .status(400)
      .json({
        success: false,
        message: "Meet Id is required"
      });
      return;
    }

    /* Check if Room Exists */
    const roomExists = await Meet.findOne({
      slug: meetId
    });

    if(!roomExists){
      res
      .status(400)
      .json({
        success: false,
        message: "Meeting room doesn't exists."
      });
      return;
    }

    res
    .status(200)
    .json({
      success: true,
      data: {
        admin: roomExists.adminId,
        meetId
      },
      message: "User joined meet successfully."
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't join meet.",
      error
    });
  }
}