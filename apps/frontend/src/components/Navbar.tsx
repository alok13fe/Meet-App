import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/src/lib/hooks";
import Link from "next/link";
import AuthContainer from "./AuthContainer";
import { setUserProfile } from "../lib/features/user/userSlice";

export default function Navbar(){
  
  const dispatch = useAppDispatch();

  const [authContainer, setAuthContainer] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { profile } = useAppSelector(state => state.user);

  function logout(e: React.MouseEvent<HTMLParagraphElement, MouseEvent>){
    e.preventDefault();

    localStorage.removeItem('token');
    dispatch(setUserProfile(null));
    setMenuOpen(false);
  }

  return (
    <>
      <nav>
        <div className="mx-auto px-5 py-2 w-full max-w-6xl flex items-center justify-between">
          <Link href='/' className="py-1 font-bold text-xl">Meet App</Link>

          <div className="hidden md:flex font-semibold gap-10">
            <p>Home</p>
            <p>Meeting</p>
            <p>Schedule</p>
            <p>About Us</p>
          </div>

          {
            !profile 
            ?
            <button 
              className="px-3 py-1 bg-black font-semibold text-white border-2 border-white rounded hover:opacity-80"
              onClick={() => {setAuthContainer(true)}}
            >
              Get Started
            </button>
            :
            <div 
              className="relative w-7 h-7 flex justify-center items-center border rounded-full"
              onClick={() => {setMenuOpen(curr => !curr)}}
            >
              <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 21C5 17.134 8.13401 14 12 14C15.866 14 19 17.134 19 21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>

              {
                menuOpen &&
                <div className="absolute top-full right-0 xl:-right-6 mt-1 bg-white overflow-hidden border rounded">
                  <p className="px-2 py-0.5 flex items-center gap-2 hover:bg-gray-200 border-b">
                    <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 21C5 17.134 8.13401 14 12 14C15.866 14 19 17.134 19 21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Account</span>
                  </p>
                  <p className="px-2 py-0.5 flex items-center gap-2 hover:bg-gray-200" onClick={logout}>
                    <svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12L13 12" stroke="#323232" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 15L20.913 12.087V12.087C20.961 12.039 20.961 11.961 20.913 11.913V11.913L18 9" stroke="#323232" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 5V4.5V4.5C16 3.67157 15.3284 3 14.5 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H14.5C15.3284 21 16 20.3284 16 19.5V19.5V19" stroke="#323232" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Logout</span>
                  </p>
                </div>
              }
            </div>
          }
        </div>
      </nav>
      {
        authContainer &&
        <AuthContainer route={'signin'} onClose={() => setAuthContainer(false)} />
      }
    </>
  )
}