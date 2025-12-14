import React, { useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useAppDispatch } from '@/src/lib/hooks';
import { setUserProfile } from '@/src/lib/features/user/userSlice';
import { z } from 'zod';
import { loginSchema } from '@repo/common/schema';
import { app } from '@/src/utils/firebase';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface SignInProps {
  setPage: React.Dispatch<React.SetStateAction<string>>; 
  onClose: () => void;
}

export default function Signin({setPage, onClose}: SignInProps){
  
  const auth = getAuth(app);
  const dispatch = useAppDispatch();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.FormEvent<HTMLInputElement>) => {
    const {name, value} = e.currentTarget as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  const loginUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = formData.password.split(' ').join('');

    if(formData.password.length !== password.length){
      setError('Password must not contain spaces');
      return;
    }

    setError('');
    setLoading(true);

    /* Logging User */
    try {
      /* Validate Input */
      loginSchema.parse(formData);

      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/user/login`, formData);

      console.log(response.data.message);
      dispatch(setUserProfile(response.data.data.user));
      localStorage.setItem('token', response.data.data.token);
      onClose();
    } catch (error){
      console.log(error);
      if(error instanceof z.ZodError){
        setError(error.issues[0]?.message);
      }
      else if(isAxiosError(error)){
        if(error.response?.status === 401){
          setError(error.response.data.message);
        }
      }
    }
    setLoading(false);
  }

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});

    setError('');
    setLoading(true);
    try{
      const responseFromGoogle = await signInWithPopup(auth, provider);
      const fullname = responseFromGoogle.user.displayName?.split(' ');

      if(!fullname){
        return;
      }

      const lastName = fullname.pop();
      const firstName = fullname.join(' ');

      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/user/google`, 
        {
          firstName,
          lastName,
          email: responseFromGoogle.user.email
        }
      );

      localStorage.setItem('token', response.data.data.token);
      dispatch(setUserProfile(response.data.data.user));
      onClose();
    } catch(error){
      console.log(error);
    }
    setLoading(false);
  }

  return (
    <main>
      <div className="min-h-screen w-screen sm:w-sm flex justify-center items-center">
        <div className="relative w-full h-screen sm:h-fit px-8 py-8 bg-white border rounded-md">
          <span 
            className="absolute top-1.5 right-1.5 p-2 cursor-pointer"
            onClick={onClose}  
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome Back</h1>
            <p className="text-gray-400 mt-2">Sign in to your account to continue</p>
          </div>
          <form onSubmit={loginUser} className="py-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input 
                name="email"
                type="email" 
                className="w-full mt-1 py-2 px-3 text-sm border rounded-md"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete='email'
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <div className='relative'>
                <input 
                  name="password"
                  type={isPasswordVisible ? "text" : "password" }
                  className="w-full mt-1 py-2 px-3 text-sm border rounded-md"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete='current-password'
                  required
                />

                <div 
                  className='p-2 absolute right-0 bottom-0' 
                  onClick={() => {setIsPasswordVisible(curr => !curr)}}
                >
                  {
                    isPasswordVisible ?
                    <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12.0001 5.25C9.22586 5.25 6.79699 6.91121 5.12801 8.44832C4.28012 9.22922 3.59626 10.0078 3.12442 10.5906C2.88804 10.8825 2.70368 11.1268 2.57736 11.2997C2.51417 11.3862 2.46542 11.4549 2.43187 11.5029C2.41509 11.5269 2.4021 11.5457 2.393 11.559L2.38227 11.5747L2.37911 11.5794L2.10547 12.0132L2.37809 12.4191L2.37911 12.4206L2.38227 12.4253L2.393 12.441C2.4021 12.4543 2.41509 12.4731 2.43187 12.4971C2.46542 12.5451 2.51417 12.6138 2.57736 12.7003C2.70368 12.8732 2.88804 13.1175 3.12442 13.4094C3.59626 13.9922 4.28012 14.7708 5.12801 15.5517C6.79699 17.0888 9.22586 18.75 12.0001 18.75C14.7743 18.75 17.2031 17.0888 18.8721 15.5517C19.72 14.7708 20.4039 13.9922 20.8757 13.4094C21.1121 13.1175 21.2964 12.8732 21.4228 12.7003C21.4859 12.6138 21.5347 12.5451 21.5682 12.4971C21.585 12.4731 21.598 12.4543 21.6071 12.441L21.6178 12.4253L21.621 12.4206L21.6224 12.4186L21.9035 12L21.622 11.5809L21.621 11.5794L21.6178 11.5747L21.6071 11.559C21.598 11.5457 21.585 11.5269 21.5682 11.5029C21.5347 11.4549 21.4859 11.3862 21.4228 11.2997C21.2964 11.1268 21.1121 10.8825 20.8757 10.5906C20.4039 10.0078 19.72 9.22922 18.8721 8.44832C17.2031 6.91121 14.7743 5.25 12.0001 5.25ZM4.29022 12.4656C4.14684 12.2885 4.02478 12.1311 3.92575 12C4.02478 11.8689 4.14684 11.7115 4.29022 11.5344C4.72924 10.9922 5.36339 10.2708 6.14419 9.55168C7.73256 8.08879 9.80369 6.75 12.0001 6.75C14.1964 6.75 16.2676 8.08879 17.8559 9.55168C18.6367 10.2708 19.2709 10.9922 19.7099 11.5344C19.8533 11.7115 19.9753 11.8689 20.0744 12C19.9753 12.1311 19.8533 12.2885 19.7099 12.4656C19.2709 13.0078 18.6367 13.7292 17.8559 14.4483C16.2676 15.9112 14.1964 17.25 12.0001 17.25C9.80369 17.25 7.73256 15.9112 6.14419 14.4483C5.36339 13.7292 4.72924 13.0078 4.29022 12.4656ZM14.25 12C14.25 13.2426 13.2427 14.25 12 14.25C10.7574 14.25 9.75005 13.2426 9.75005 12C9.75005 10.7574 10.7574 9.75 12 9.75C13.2427 9.75 14.25 10.7574 14.25 12ZM15.75 12C15.75 14.0711 14.0711 15.75 12 15.75C9.92898 15.75 8.25005 14.0711 8.25005 12C8.25005 9.92893 9.92898 8.25 12 8.25C14.0711 8.25 15.75 9.92893 15.75 12Z" fill="#000000"/>
                    </svg>
                    :
                    <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.5778 13.6334C16.2396 12.1831 15.9738 10.4133 14.7803 9.21976C13.5868 8.02628 11.817 7.76042 10.3667 8.4222L11.5537 9.60918C12.315 9.46778 13.1307 9.69153 13.7196 10.2804C14.3085 10.8693 14.5323 11.6851 14.3909 12.4464L15.5778 13.6334Z" fill="#000000"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M5.86339 7.80781C5.60443 8.02054 5.35893 8.23562 5.12798 8.44832C4.28009 9.22922 3.59623 10.0078 3.1244 10.5906C2.88801 10.8825 2.70365 11.1268 2.57733 11.2997C2.51414 11.3862 2.46539 11.4549 2.43184 11.5029C2.41506 11.5269 2.40207 11.5457 2.39297 11.559L2.38224 11.5747L2.37908 11.5794L2.37806 11.5809L2.09656 12L2.37741 12.4181L2.37806 12.4191L2.37908 12.4206L2.38224 12.4253L2.39297 12.441C2.40207 12.4543 2.41506 12.4731 2.43184 12.4971C2.46539 12.5451 2.51414 12.6138 2.57733 12.7003C2.70365 12.8732 2.88801 13.1175 3.1244 13.4094C3.59623 13.9922 4.28009 14.7708 5.12798 15.5517C6.79696 17.0888 9.22583 18.75 12 18.75C13.3694 18.75 14.6547 18.3452 15.806 17.7504L14.6832 16.6277C13.8289 17.0123 12.9256 17.25 12 17.25C9.80366 17.25 7.73254 15.9112 6.14416 14.4483C5.36337 13.7292 4.72921 13.0078 4.29019 12.4656C4.14681 12.2885 4.02475 12.1311 3.92572 12C4.02475 11.8689 4.14681 11.7115 4.29019 11.5344C4.72921 10.9922 5.36337 10.2708 6.14416 9.55168C6.39447 9.32114 6.65677 9.09369 6.92965 8.87408L5.86339 7.80781ZM17.0705 15.1258C17.3434 14.9063 17.6056 14.6788 17.8559 14.4483C18.6367 13.7292 19.2708 13.0078 19.7099 12.4656C19.8532 12.2885 19.9753 12.1311 20.0743 12C19.9753 11.8689 19.8532 11.7115 19.7099 11.5344C19.2708 10.9922 18.6367 10.2708 17.8559 9.55168C16.2675 8.08879 14.1964 6.75 12 6.75C11.0745 6.75 10.1712 6.98772 9.31694 7.37228L8.1942 6.24954C9.34544 5.65475 10.6307 5.25 12 5.25C14.7742 5.25 17.2031 6.91121 18.8721 8.44832C19.72 9.22922 20.4038 10.0078 20.8757 10.5906C21.112 10.8825 21.2964 11.1268 21.4227 11.2997C21.4859 11.3862 21.5347 11.4549 21.5682 11.5029C21.585 11.5269 21.598 11.5457 21.6071 11.559L21.6178 11.5747L21.621 11.5794L21.622 11.5809L21.9035 12L21.6224 12.4186L21.621 12.4206L21.6178 12.4253L21.6071 12.441C21.598 12.4543 21.585 12.4731 21.5682 12.4971C21.5347 12.5451 21.4859 12.6138 21.4227 12.7003C21.2964 12.8732 21.112 13.1175 20.8757 13.4094C20.4038 13.9922 19.72 14.7708 18.8721 15.5517C18.6412 15.7644 18.3957 15.9794 18.1368 16.1921L17.0705 15.1258Z" fill="#000000"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M18.75 19.8107L3.75 4.81066L4.81066 3.75L19.8107 18.75L18.75 19.8107Z" fill="#000000"/>
                    </svg>
                  }
                </div>
              </div>
            </div>

            <div>
              <p className="text-right text-sm cursor-pointer">
                Forgot Password?
              </p>

              {
                error &&
                <p className='text-red-600 text-xs'>
                  {error}
                </p>
              }
            </div>
            
            <button type='submit' className={`w-full py-2 bg-black text-white font-medium cursor-pointer rounded-md ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} hover:opacity-80`} disabled={loading}>
              Sign In
            </button>
          </form>
          <button 
            className={`w-full py-1.5 flex items-center justify-center gap-2 font-medium border-2 rounded-md ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} hover:bg-gray-100`}
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <svg width="18px" height="18px" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M30.0014 16.3109C30.0014 15.1598 29.9061 14.3198 29.6998 13.4487H16.2871V18.6442H24.1601C24.0014 19.9354 23.1442 21.8798 21.2394 23.1864L21.2127 23.3604L25.4536 26.58L25.7474 26.6087C28.4458 24.1665 30.0014 20.5731 30.0014 16.3109Z" fill="#4285F4"/>
              <path d="M16.2863 29.9998C20.1434 29.9998 23.3814 28.7553 25.7466 26.6086L21.2386 23.1863C20.0323 24.0108 18.4132 24.5863 16.2863 24.5863C12.5086 24.5863 9.30225 22.1441 8.15929 18.7686L7.99176 18.7825L3.58208 22.127L3.52441 22.2841C5.87359 26.8574 10.699 29.9998 16.2863 29.9998Z" fill="#34A853"/>
              <path d="M8.15964 18.769C7.85806 17.8979 7.68352 16.9645 7.68352 16.0001C7.68352 15.0356 7.85806 14.1023 8.14377 13.2312L8.13578 13.0456L3.67083 9.64746L3.52475 9.71556C2.55654 11.6134 2.00098 13.7445 2.00098 16.0001C2.00098 18.2556 2.55654 20.3867 3.52475 22.2845L8.15964 18.769Z" fill="#FBBC05"/>
              <path d="M16.2864 7.4133C18.9689 7.4133 20.7784 8.54885 21.8102 9.4978L25.8419 5.64C23.3658 3.38445 20.1435 2 16.2864 2C10.699 2 5.8736 5.1422 3.52441 9.71549L8.14345 13.2311C9.30229 9.85555 12.5086 7.4133 16.2864 7.4133Z" fill="#EB4335"/>
            </svg>
            <span>
              Sign in with Google
            </span>
          </button>
          <p className="mt-2 text-center text-gray-400 text-sm">
            Don&apos;t have an account? <button className="cursor-pointer" onClick={() => {setPage('signup')}}>Sign Up</button>
          </p>
        </div>
      </div>
    </main>
  )
}
