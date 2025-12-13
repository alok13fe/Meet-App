"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "../lib/hooks";
import { setUserProfile } from "../lib/features/user/userSlice";
import Navbar from "@/src/components/Navbar";
import axios, { isAxiosError } from "axios";

export default function Home(){

  const router = useRouter();
  const dispatch = useAppDispatch();

  const { profile } = useAppSelector(state => state.user);

  const [meetLink, setMeetLink] = useState('');
  const [loading, setLoading] = useState(false);

  async function createMeet(){
    if(!profile){
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/meet/create`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      router.push(`/meet/${response.data.data.meetId}`);
    } catch (error) {
      console.log(error);
      if(isAxiosError(error)){
        if(error.status === 403){
          dispatch(setUserProfile(null));
        }
      }
    }
    setLoading(false);
  }

  async function joinMeet(){
    const meetId = meetLink.replace('http://localhost:3000/meet/', '');
    meetId.split(' ').join('');

    if(meetId.length === 10){
      setLoading(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BASE_URL}/meet/join/${meetId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        )
        router.push(`/meet/${response.data.data.meetId}`);
      } catch (error) {
        console.log(error);
        if(isAxiosError(error)){
          if(error.status === 403){
            dispatch(setUserProfile(null));
          }
        }
      }
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="dark">
        <div className="w-full max-w-6xl h-[calc(100vh-53px)] mx-auto p-3 flex items-center justify-center">
          <div className="w-full pt-20 md:pt-0 px-2 md:px-0 space-y-2">
            <h1 className="mb-5 font-bold text-5xl sm:text-6xl text-center">Video calls for <br /> <span className="text-gray-400">everyone, anywhere</span></h1>
            <p className="text-gray-400 text-center text-md sm:text-lg">Connect instantly with your team, friends and family with<br /> crystal clear video and audio.</p>
            <div className="w-full my-10 flex flex-col sm:flex-row justify-center gap-5 sm:gap-10">
              <button 
                className="px-5 py-2 bg-black font-semibold text-white rounded hover:opacity-80" 
                onClick={createMeet}
                disabled={loading}
              >
                New Meeting
              </button>
              <div className="flex overflow-hidden border rounded">
                <input 
                  type="text" 
                  value={meetLink}
                  className="flex-1 p-2 outline-0"
                  placeholder="Enter a code or link"
                  onChange={(e) => {setMeetLink(e.target.value)}}
                />
                <div className="p-2 bg-white hover:bg-gray-200" onClick={joinMeet}>
                  <svg width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M17.6492 11.2501L12.7904 6.53852L13.8346 5.46167L20.5774 12.0001L13.8346 18.5385L12.7904 17.4617L17.6492 12.7501H3V11.2501H17.6492Z" fill="#080341"/>
                  </svg>
                </div>
              </div>
            </div>
            <p className="mt-2 text-gray-400 text-center">Secure, fast, reliable video meetings</p>
          </div>
        </div>
      </main>
    </>
  )
}