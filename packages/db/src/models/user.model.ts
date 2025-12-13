import mongoose, { Document } from 'mongoose';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
  generateJWT(): string;
}

type UserDocument = Document<unknown, {}, IUser> & IUser & IUserMethods;

const userSchema = new mongoose.Schema<IUser, mongoose.Model<IUser>, IUserMethods>(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password:{
      type: String,
      required: true,
      minlength: [6, 'Password must be atleast 6 characters long'],
      maxlength: [50, 'Password can be atmost 50 characters long'],
      select: false
    }
  },
  {
    timestamps: true
  }
)

userSchema.pre('save', async function(next){
  if(!this.isModified('password')) return;

  this.password = await bcryptjs.hash(this.password, 10);
  next();
})

userSchema.methods.comparePassword = async function(password){
  return await bcryptjs.compare(password, this.password);
}

userSchema.methods.generateJWT = function(): string{

  return jwt.sign(
    {
      id: this._id,
      email: this.email
    },
    process.env.JWT_TOKEN_SECRET as string,
    {
      expiresIn: process.env.JWT_TOKEN_EXPIRY as unknown as jwt.SignOptions["expiresIn"] 
    }
  )
}

const User = mongoose.model('User', userSchema);

export { User };
export type { UserDocument };